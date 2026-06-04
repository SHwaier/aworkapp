import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import File, { IFile } from "@/models/File";
import { createAuditLog } from "@/models/AuditLog";
import mongoose from "mongoose";

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
    throw new Error("File extension not allowed. Allowed types: PDF, DOCX.");
  }

  // Validate MIME type
  const mime = file.type || "application/octet-stream";
  if (mime !== "application/octet-stream" && !ALLOWED_MIME_TYPES.includes(mime)) {
    throw new Error("File type not allowed.");
  }

  // Validate File Size
  const maxLimit = parseInt(process.env.MAX_FILE_SIZE || "10485760"); // 10MB default
  if (file.size > maxLimit) {
    throw new Error(`File too large. Max allowed is ${maxLimit / (1024 * 1024)}MB`);
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
    const storageDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FILE_STORAGE_PATH || "./uploads");
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
 * Delete a file from disk/S3 and remove its File document
 */
export async function deleteFile(fileId: string | mongoose.Types.ObjectId, userId: string): Promise<boolean> {
  const fileDoc = await File.findOne({ _id: fileId, userId }).select("+storageKey");
  if (!fileDoc) return false;

  await File.deleteOne({ _id: fileDoc._id });

  try {
    if (fileDoc.storageProvider === "r2" || fileDoc.storageProvider === "s3") {
      const { deleteFromS3 } = await import("@/lib/storage/s3");
      await deleteFromS3(fileDoc.storageKey);
    } else {
      const storageDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FILE_STORAGE_PATH || "./uploads");
      const filePath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), storageDir, fileDoc.storageKey);
      await fs.unlink(filePath);
    }
  } catch (err) {
    console.error("Failed to delete file from storage:", err);
  }

  return true;
}
