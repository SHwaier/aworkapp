import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import dbConnect from "@/lib/db/mongoose";
import Application from "@/models/Application";
import ResumeVersion from "@/models/ResumeVersion";
import ResumeSnapshot from "@/models/ResumeSnapshot";
import File from "@/models/File";
import TimelineEvent from "@/models/TimelineEvent";
import { requireAuth } from "@/lib/auth/session";
import { mongoIdSchema } from "@/lib/validators/schemas";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/applications/:id/resume/upload-assign
 * Orchestrates:
 * 1. File upload & hash-based deduplication
 * 2. Targeted ResumeVersion creation
 * 3. Application ResumeSnapshot association
 * 4. Timeline Event logging & Audit Log creation
 */
export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id: applicationId } = await params;
    mongoIdSchema.parse(applicationId);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`upload-assign-resume:${session.id || ip}`, RATE_LIMITS.upload);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many upload attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.upload) }
      );
    }

    await dbConnect();

    // 1. Verify Application exists and belongs to the user
    const app = await Application.findOne({ _id: applicationId, userId: session.id }).populate("companyId");
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    // 2. Parse Form Data
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file || !(file instanceof Blob)) {
      return errorResponse("No file uploaded", 400);
    }

    // Get file name from form-data metadata or set default
    const originalFileName = (file as any).name || "resume.pdf";

    // Validate Extension
    const ext = path.extname(originalFileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return errorResponse("File extension not allowed. Allowed types: PDF, DOCX.", 400);
    }

    // Validate MIME type
    const mime = file.type || "application/octet-stream";
    if (mime !== "application/octet-stream" && !ALLOWED_MIME_TYPES.includes(mime)) {
      return errorResponse("File type not allowed.", 400);
    }

    // Validate File Size
    const maxLimit = parseInt(process.env.MAX_FILE_SIZE || "10485760"); // 10MB default
    if (file.size > maxLimit) {
      return errorResponse(`File too large. Max allowed is ${maxLimit / (1024 * 1024)}MB`, 400);
    }

    // 3. Process File Content and Calculate Hash
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Check if duplicate file already exists
    let fileDoc = await File.findOne({ userId: session.id, fileHash: hash });

    if (!fileDoc) {
      // Determine storage provider and upload key
      const provider = (process.env.FILE_STORAGE_PROVIDER || "local").toLowerCase();
      const uniqueKey = `${session.id}_${crypto.randomBytes(16).toString("hex")}_${path.basename(
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
      fileDoc = await File.create({
        userId: session.id,
        originalFileName,
        displayName: originalFileName,
        fileType: ext,
        mimeType: mime,
        fileSize: file.size,
        storageProvider: provider === "r2" ? "r2" : provider === "s3" ? "s3" : "local",
        storageKey: uniqueKey,
        fileHash: hash,
        category: "resume",
      });
    }

    // 4. Create Targeted ResumeVersion
    const companyName = (app.companyId as any)?.name || "Target Company";
    const resumeName = `${companyName} Resume - v1`;
    const targetIndustry = (app.companyId as any)?.industry || "";

    const resumeVersion = await ResumeVersion.create({
      userId: session.id,
      name: resumeName,
      versionNumber: 1,
      targetRole: app.jobTitle || "Software Engineer",
      targetIndustry,
      skillsEmphasized: [],
      experienceEmphasized: [],
      projectEmphasized: [],
      fileId: fileDoc._id,
      notes: `Tailored resume version created automatically on upload for application at ${companyName}.`,
      isActive: true,
    });

    // 5. Create or Update ResumeSnapshot
    let snapshot = await ResumeSnapshot.findOne({ applicationId, userId: session.id });

    if (snapshot) {
      // Clean up previous custom file if there was one
      if (snapshot.finalSubmittedFileId) {
        const oldFile = await File.findOne({ _id: snapshot.finalSubmittedFileId, userId: session.id }).select("+storageKey");
        if (oldFile) {
          await File.deleteOne({ _id: oldFile._id });
          try {
            if (oldFile.storageProvider === "r2" || oldFile.storageProvider === "s3") {
              const { deleteFromS3 } = await import("@/lib/storage/s3");
              await deleteFromS3(oldFile.storageKey);
            } else {
              const storageDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FILE_STORAGE_PATH || "./uploads");
              const filePath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), storageDir, oldFile.storageKey);
              await fs.unlink(filePath);
            }
          } catch (err) {
            console.error("Failed to delete older customized file during re-assign:", err);
          }
        }
      }

      snapshot.baseResumeVersionId = resumeVersion._id;
      snapshot.finalSubmittedFileId = null;
      snapshot.manuallyEdited = false;
      await snapshot.save();
    } else {
      snapshot = await ResumeSnapshot.create({
        userId: session.id,
        applicationId: app._id,
        baseResumeVersionId: resumeVersion._id,
        finalSubmittedFileId: null,
        manuallyEdited: false,
        tailoringNotes: "",
        aiGeneratedChangeSummary: "",
        keywordsAdded: [],
        keywordsMissing: [],
        matchScore: null,
      });
    }

    // 6. Log System Timeline Event
    await TimelineEvent.create({
      userId: session.id,
      applicationId: app._id,
      type: "document_submitted",
      title: "Resume uploaded & assigned",
      description: `"${fileDoc.displayName}" uploaded and assigned as the tailored resume for this application.`,
      eventDate: new Date(),
      relatedFileIds: [fileDoc._id],
      source: "system",
      statusAfterEvent: app.currentStatus,
      lifecycleStageAfterEvent: app.lifecycleStage,
    });

    // 7. Audit Logging
    await createAuditLog({
      userId: session.id,
      action: "resume_snapshot.created",
      entityType: "resume_snapshot",
      entityId: snapshot._id.toString(),
      metadata: { applicationId, fileId: fileDoc._id.toString(), resumeVersionId: resumeVersion._id.toString() },
      request,
    });

    const populatedSnapshot = await ResumeSnapshot.findById(snapshot._id)
      .populate({
        path: "baseResumeVersionId",
        populate: { path: "fileId", select: "displayName fileType mimeType fileSize" },
      })
      .populate("finalSubmittedFileId", "displayName fileType mimeType fileSize")
      .lean();

    return successResponse({ resumeSnapshot: populatedSnapshot }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
