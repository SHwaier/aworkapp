import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/guard";
import { assignResumeSchema, mongoIdSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { assignResumeToApplication, unassignResumeFromApplication } from "@/lib/services/resume";
import { getApplicationResume } from "@/lib/services/resume-queries";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/applications/:id/resume
 * The resume version this application uses, its other versions, and whether a newer one exists.
 */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);
    const limited = rateLimitResponse(`app-resume:${session.id}`, RATE_LIMITS.api);
    if (limited) return limited;

    await dbConnect();
    return successResponse({ assigned: await getApplicationResume(id, session.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/applications/:id/resume { resumeId, versionNumber? }
 * Assign a resume (its current version by default) or switch to another version.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);
    const limited = rateLimitResponse(`app-resume-assign:${session.id}`, RATE_LIMITS.api);
    if (limited) return limited;

    const { resumeId, versionNumber } = assignResumeSchema.parse(await request.json());
    await dbConnect();
    await assignResumeToApplication({
      applicationId: id,
      resumeId,
      versionNumber,
      userId: session.id,
      request,
    });
    return successResponse({ assigned: await getApplicationResume(id, session.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/applications/:id/resume — remove the resume from this application. */
export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);
    const limited = rateLimitResponse(`app-resume-unassign:${session.id}`, RATE_LIMITS.api);
    if (limited) return limited;

    await dbConnect();
    const removed = await unassignResumeFromApplication(id, session.id, request);
    if (!removed) return errorResponse("No resume is assigned to this application", 404);
    return successResponse({ assigned: null });
  } catch (error) {
    return handleApiError(error);
  }
}
