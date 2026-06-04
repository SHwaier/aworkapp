import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import dbConnect from "@/lib/db/mongoose";
import Application from "@/models/Application";
import ResumeVersion from "@/models/ResumeVersion";
import ResumeSnapshot from "@/models/ResumeSnapshot";
import File from "@/models/File";
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/applications/:id/resume/customize
 * Converts the active DOCX resume file into clean HTML for editing.
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id: applicationId } = await params;
    mongoIdSchema.parse(applicationId);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`customize-resume-get:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    // Verify application
    const app = await Application.findOne({ _id: applicationId, userId: session.id }).populate("companyId");
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    // Find resume snapshot
    const snapshot = await ResumeSnapshot.findOne({ applicationId, userId: session.id })
      .populate("baseResumeVersionId")
      .populate("finalSubmittedFileId");

    if (!snapshot) {
      return errorResponse("No resume assigned to this application yet", 400);
    }

    // Determine which file to load: custom version if edited, otherwise base version
    let fileDoc: any = snapshot.finalSubmittedFileId;
    if (!fileDoc) {
      const baseVersion = await ResumeVersion.findOne({
        _id: snapshot.baseResumeVersionId,
        userId: session.id,
      }).populate("fileId");
      fileDoc = baseVersion?.fileId || null;
    }

    if (!fileDoc) {
      return errorResponse("No document file associated with this resume version", 400);
    }

    return successResponse({
      fileId: fileDoc._id.toString(),
      manuallyEdited: snapshot.manuallyEdited,
      jobTitle: app.jobTitle,
      companyName: (app.companyId as any)?.name || "Company",
      jobDescription: app.jobDescription || "",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/applications/:id/resume/customize
 * Receives customized DOCX buffer (base64), saves it, and updates the ResumeSnapshot.
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
    const rateLimit = checkRateLimit(`customize-resume-post:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const { base64 } = await request.json();
    if (!base64) {
      return errorResponse("base64 content is required", 400);
    }

    await dbConnect();

    // Verify application
    const app = await Application.findOne({ _id: applicationId, userId: session.id }).populate("companyId");
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    // Find resume snapshot
    const snapshot = await ResumeSnapshot.findOne({ applicationId, userId: session.id });
    if (!snapshot) {
      return errorResponse("No resume assigned to this application", 400);
    }

    const companyName = (app.companyId as any)?.name || "Company";
    const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, "_");
    const originalFileName = `Custom_Resume_${safeCompanyName}.docx`;
    const displayName = `Custom Resume (${companyName})`;

    // Convert Base64 back to DOCX buffer
    const docxBuffer = Buffer.from(base64, "base64");

    // Generate SHA-256 hash
    const hash = crypto.createHash("sha256").update(docxBuffer).digest("hex");

    // Storage provider setup
    const provider = (process.env.FILE_STORAGE_PROVIDER || "local").toLowerCase();
    const uniqueKey = `${session.id}_custom_${crypto.randomBytes(16).toString("hex")}_${originalFileName}`;

    if (provider === "s3" || provider === "r2") {
      const { uploadToS3 } = await import("@/lib/storage/s3");
      await uploadToS3(uniqueKey, docxBuffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } else {
      const storageDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FILE_STORAGE_PATH || "./uploads");
      await fs.mkdir(storageDir, { recursive: true });
      const fullPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), storageDir, uniqueKey);
      await fs.writeFile(fullPath, docxBuffer);
    }

    // Check if there was a previous customized file that should be deleted
    const oldCustomFileId = snapshot.finalSubmittedFileId;

    // Create DB entry for the new file
    const fileDoc = await File.create({
      userId: session.id,
      originalFileName,
      displayName,
      fileType: ".docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: docxBuffer.length,
      storageProvider: provider === "r2" ? "r2" : provider === "s3" ? "s3" : "local",
      storageKey: uniqueKey,
      fileHash: hash,
      category: "resume",
    });

    // Update snapshot
    snapshot.finalSubmittedFileId = fileDoc._id;
    snapshot.manuallyEdited = true;
    await snapshot.save();

    // Physically delete old customized file if it exists
    if (oldCustomFileId) {
      const oldFile = await File.findOne({ _id: oldCustomFileId, userId: session.id }).select("+storageKey");
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
          console.error("Failed to delete older customized file:", err);
        }
      }
    }

    await createAuditLog({
      userId: session.id,
      action: "resume_snapshot.customized",
      entityType: "resume_snapshot",
      entityId: snapshot._id.toString(),
      metadata: { applicationId, fileId: fileDoc._id.toString() },
      request,
    });

    const populatedSnapshot = await ResumeSnapshot.findById(snapshot._id)
      .populate({
        path: "baseResumeVersionId",
        populate: { path: "fileId", select: "displayName fileType mimeType fileSize" },
      })
      .populate("finalSubmittedFileId", "displayName fileType mimeType fileSize")
      .lean();

    return successResponse({ resumeSnapshot: populatedSnapshot });
  } catch (error) {
    return handleApiError(error);
  }
}
