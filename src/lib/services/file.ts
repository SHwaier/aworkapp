import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import File, { IFile } from "@/models/File";
import { createAuditLog } from "@/models/AuditLog";
import mongoose from "mongoose";
import { AppError } from "@/lib/api/app-error";
import { extractResumeText, hashText, TextExtractionError } from "@/lib/resume-text/extract";

const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface UploadFileOptions {
  file: Blob;
  originalFileName: string;
  userId: string;
  category?: string;
  request?: Request;
}

/**
 * Handle file upload, storage, deduplication, and database registration
 */
export async function uploadFile({
  file,
  originalFileName,
  userId,
  category = "other",
  request,
}: UploadFileOptions): Promise<{ file: IFile; duplicate: boolean }> {
  // Validate Extension
  const ext = path.extname(originalFileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new AppError("File extension not allowed. Allowed types: PDF, DOCX.", 400);
  }

  // Validate MIME type
  const mime = file.type || "application/octet-stream";
  if (mime !== "application/octet-stream" && !ALLOWED_MIME_TYPES.includes(mime)) {
    throw new AppError("File type not allowed.", 400);
  }

  // Validate File Size
  const maxLimit = parseInt(process.env.MAX_FILE_SIZE || "10485760"); // 10MB default
  if (file.size > maxLimit) {
    throw new AppError(`File too large. Max allowed is ${maxLimit / (1024 * 1024)}MB`, 400);
  }

  // Read file content and compute SHA-256 hash
  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Check for deduplication
  const existingFile = await File.findOne({ userId, fileHash: hash });
  if (existingFile) {
    return { file: existingFile, duplicate: true };
  }

  // Determine storage provider and upload key
  const provider = (process.env.FILE_STORAGE_PROVIDER || "local").toLowerCase();
  const uniqueKey = `${userId}_${crypto.randomBytes(16).toString("hex")}_${path.basename(
    originalFileName
  )}`;

  // Upload to Storage
  if (provider === "s3" || provider === "r2") {
    const { uploadToS3 } = await import("@/lib/storage/s3");
    await uploadToS3(uniqueKey, buffer, mime);
  } else {
    const storageDir = path.resolve(
      /*turbopackIgnore: true*/ process.cwd(),
      process.env.FILE_STORAGE_PATH || "./uploads"
    );
    await fs.mkdir(storageDir, { recursive: true });
    const fullPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), storageDir, uniqueKey);
    await fs.writeFile(fullPath, buffer);
  }

  // Create new File entry in MongoDB
  const doc = await File.create({
    userId,
    originalFileName,
    displayName: originalFileName,
    fileType: ext,
    mimeType: mime,
    fileSize: file.size,
    storageProvider: provider === "r2" ? "r2" : provider === "s3" ? "s3" : "local",
    storageKey: uniqueKey,
    fileHash: hash,
    category,
  });

  // Extract text now so AI analysis never waits on it; failures are recorded, not fatal
  await storeExtractedText(doc, buffer);

  if (request) {
    await createAuditLog({
      userId,
      action: "file.uploaded",
      entityType: "file",
      entityId: doc._id.toString(),
      metadata: { originalFileName, fileSize: file.size, category },
      request,
    });
  }

  return { file: doc, duplicate: false };
}

/**
 * Delete a file from disk/S3 and remove its File document.
 * Also cleans up any references in ResumeVersion and ResumeSnapshot.
 */
export async function deleteFile(
  fileId: string | mongoose.Types.ObjectId,
  userId: string
): Promise<boolean> {
  const fileDoc = await File.findOne({ _id: fileId, userId }).select("+storageKey");
  if (!fileDoc) return false;

  await File.deleteOne({ _id: fileDoc._id });

  // Cascade: null out any ResumeVersion that references this file
  const ResumeVersion = (await import("@/models/ResumeVersion")).default;
  await ResumeVersion.updateMany({ userId, fileId: fileDoc._id }, { $set: { fileId: null } });

  // Cascade: null out any ResumeSnapshot that references this file as finalSubmittedFileId
  const ResumeSnapshot = (await import("@/models/ResumeSnapshot")).default;
  await ResumeSnapshot.updateMany(
    { userId, finalSubmittedFileId: fileDoc._id },
    { $set: { finalSubmittedFileId: null, manuallyEdited: false } }
  );

  try {
    if (fileDoc.storageProvider === "r2" || fileDoc.storageProvider === "s3") {
      const { deleteFromS3 } = await import("@/lib/storage/s3");
      await deleteFromS3(fileDoc.storageKey);
    } else {
      await fs.unlink(localStoragePath(fileDoc.storageKey));
    }
  } catch (err) {
    console.error("Failed to delete file from storage:", err);
  }

  return true;
}

function localStoragePath(storageKey: string): string {
  const storageDir = path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.FILE_STORAGE_PATH || "./uploads"
  );
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), storageDir, storageKey);
}

/**
 * Read a stored file's bytes from local disk or S3/R2.
 * The document must have been loaded with `.select("+storageKey")`.
 */
export async function readStoredFile(
  fileDoc: Pick<IFile, "storageProvider" | "storageKey">
): Promise<Buffer> {
  if (fileDoc.storageProvider === "r2" || fileDoc.storageProvider === "s3") {
    const { downloadFromS3 } = await import("@/lib/storage/s3");
    return downloadFromS3(fileDoc.storageKey);
  }
  return fs.readFile(localStoragePath(fileDoc.storageKey));
}

/** Extract text from the file bytes and save it (or the reason it failed) on the File doc. */
async function storeExtractedText(fileDoc: IFile, buffer: Buffer): Promise<void> {
  try {
    const { text, pageCount } = await extractResumeText(buffer, fileDoc);
    fileDoc.extractedText = text;
    fileDoc.textHash = hashText(text);
    fileDoc.textPageCount = pageCount;
    fileDoc.textExtractionError = null;
  } catch (err) {
    fileDoc.extractedText = null;
    fileDoc.textHash = null;
    fileDoc.textExtractionError =
      err instanceof TextExtractionError ? err.message : "Couldn't read text from this file.";
    if (!(err instanceof TextExtractionError)) {
      console.error("Text extraction failed:", err);
    }
  }
  fileDoc.textExtractedAt = new Date();
  await fileDoc.save();
}

export interface FileText {
  text: string;
  textHash: string;
  pageCount: number | null;
}

/**
 * Return a file's extracted text, extracting it on first use for files uploaded
 * before extraction existed. Throws AppError(422) when the file has no readable text.
 */
export async function ensureFileText(
  fileId: string | mongoose.Types.ObjectId,
  userId: string
): Promise<FileText> {
  const fileDoc = await File.findOne({ _id: fileId, userId }).select("+storageKey +extractedText");
  if (!fileDoc) {
    throw new AppError("Resume file not found", 404);
  }

  if (!fileDoc.textExtractedAt) {
    await storeExtractedText(fileDoc, await readStoredFile(fileDoc));
  }

  if (!fileDoc.extractedText || !fileDoc.textHash) {
    throw new AppError(fileDoc.textExtractionError || "Couldn't read text from this file.", 422);
  }

  return {
    text: fileDoc.extractedText,
    textHash: fileDoc.textHash,
    pageCount: fileDoc.textPageCount,
  };
}
