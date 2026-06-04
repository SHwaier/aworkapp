import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Application from "@/models/Application";
import ResumeSnapshot from "@/models/ResumeSnapshot";
import { requireAuth } from "@/lib/auth/session";
import { mongoIdSchema } from "@/lib/validators/schemas";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api/response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import {
  assignResumeToApplication,
  unassignResumeFromApplication,
} from "@/lib/services/resume";

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

    // Call service to assign resume to application
    const snapshot = await assignResumeToApplication({
      applicationId,
      resumeVersionId,
      userId: session.id,
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

    // Call service to unassign resume from application
    const success = await unassignResumeFromApplication(applicationId, session.id, request);
    if (!success) {
      return errorResponse("No resume snapshot assigned to this application", 404);
    }

    return successResponse({ message: "Resume successfully unassigned from application" });
  } catch (error) {
    return handleApiError(error);
  }
}
