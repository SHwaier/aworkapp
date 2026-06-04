import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import ResumeVersion from "@/models/ResumeVersion";
import File from "@/models/File";
import { requireAuth } from "@/lib/auth/session";
import {
  updateResumeVersionSchema,
  mongoIdSchema,
} from "@/lib/validators/schemas";
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
 * GET /api/resumes/:id
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`get-resume:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    const resume = await ResumeVersion.findOne({
      _id: id,
      userId: session.id,
    })
      .populate("fileId", "displayName fileType mimeType")
      .lean();

    if (!resume) {
      return errorResponse("Not found", 404);
    }

    return successResponse({ resume });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/resumes/:id
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`update-resume:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const body = await request.json();
    const validated = updateResumeVersionSchema.parse(body);

    await dbConnect();

    const resume = await ResumeVersion.findOneAndUpdate(
      { _id: id, userId: session.id },
      { $set: validated },
      { new: true, runValidators: true }
    );

    if (!resume) {
      return errorResponse("Not found", 404);
    }

    await createAuditLog({
      userId: session.id,
      action: "resume.updated",
      entityType: "resume",
      entityId: id,
      metadata: { fields: Object.keys(validated) },
      request,
    });

    return successResponse({ resume });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/resumes/:id
 */
export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`delete-resume:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    const resume = await ResumeVersion.findOneAndDelete({
      _id: id,
      userId: session.id,
    });

    if (!resume) {
      return errorResponse("Not found", 404);
    }

    // Cascade: delete any ResumeSnapshots that reference this resume version
    const ResumeSnapshot = (await import("@/models/ResumeSnapshot")).default;
    const orphanedSnapshots = await ResumeSnapshot.find({
      userId: session.id,
      baseResumeVersionId: id,
    });

    // Clean up any custom files from orphaned snapshots before deleting them
    for (const snap of orphanedSnapshots) {
      if (snap.finalSubmittedFileId) {
        try {
          const { deleteFile: deleteFileService } = await import("@/lib/services/file");
          await deleteFileService(snap.finalSubmittedFileId, session.id);
        } catch {
          // Best-effort cleanup
        }
      }
    }
    await ResumeSnapshot.deleteMany({
      userId: session.id,
      baseResumeVersionId: id,
    });

    await createAuditLog({
      userId: session.id,
      action: "resume.deleted",
      entityType: "resume",
      entityId: id,
      request,
    });

    return successResponse({ message: "Resume version deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
