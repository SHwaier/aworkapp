import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
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
 * GET /api/applications/:id/resume
 * Retrieve the resume snapshot assigned to this application.
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
    const rateLimit = checkRateLimit(`get-app-resume:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    // Verify application exists and belongs to user
    const app = await Application.findOne({ _id: applicationId, userId: session.id });
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    // Find resume snapshot
    const snapshot = await ResumeSnapshot.findOne({
      applicationId,
      userId: session.id,
    })
      .populate({
        path: "baseResumeVersionId",
        populate: { path: "fileId", select: "displayName fileType mimeType fileSize" },
      })
      .populate("finalSubmittedFileId", "displayName fileType mimeType fileSize")
      .lean();

    return successResponse({ resumeSnapshot: snapshot || null });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/applications/:id/resume
 * Assign a resume version (ResumeVersion) to this application.
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
    const rateLimit = checkRateLimit(`assign-app-resume:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const { resumeVersionId } = await request.json();
    if (!resumeVersionId) {
      return errorResponse("resumeVersionId is required", 400);
    }
    mongoIdSchema.parse(resumeVersionId);

    await dbConnect();

    // Verify application exists and belongs to user
    const app = await Application.findOne({ _id: applicationId, userId: session.id });
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    // Verify resume version exists and belongs to user
    const resumeVersion = await ResumeVersion.findOne({ _id: resumeVersionId, userId: session.id });
    if (!resumeVersion) {
      return errorResponse("Resume version not found", 404);
    }

    // Check if snapshot already exists
    let snapshot = await ResumeSnapshot.findOne({ applicationId, userId: session.id });

    if (snapshot) {
      // If there's an existing custom file, clean it up
      if (snapshot.finalSubmittedFileId && snapshot.baseResumeVersionId.toString() !== resumeVersionId) {
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
            console.error("Failed to delete old customized file from disk/S3:", err);
          }
        }
      }

      // Update base resume
      snapshot.baseResumeVersionId = resumeVersion._id;
      snapshot.finalSubmittedFileId = null;
      snapshot.manuallyEdited = false;
      await snapshot.save();
    } else {
      // Create new snapshot
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

    await createAuditLog({
      userId: session.id,
      action: "resume_snapshot.assigned",
      entityType: "resume_snapshot",
      entityId: snapshot._id.toString(),
      metadata: { applicationId, resumeVersionId },
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

/**
 * DELETE /api/applications/:id/resume
 * Unassign (delete) the resume snapshot from this application.
 */
export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id: applicationId } = await params;
    mongoIdSchema.parse(applicationId);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`unassign-app-resume:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    // Find and delete the snapshot
    const snapshot = await ResumeSnapshot.findOne({ applicationId, userId: session.id });
    if (!snapshot) {
      return errorResponse("No resume snapshot assigned to this application", 404);
    }

    // Clean up custom file if it exists
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
          console.error("Failed to delete customized file:", err);
        }
      }
    }

    await ResumeSnapshot.deleteOne({ _id: snapshot._id });

    await createAuditLog({
      userId: session.id,
      action: "resume_snapshot.unassigned",
      entityType: "resume_snapshot",
      entityId: snapshot._id.toString(),
      metadata: { applicationId },
      request,
    });

    return successResponse({ message: "Resume successfully unassigned from application" });
  } catch (error) {
    return handleApiError(error);
  }
}
