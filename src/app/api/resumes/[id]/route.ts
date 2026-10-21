import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Resume from "@/models/Resume";
import { requireAuth } from "@/lib/auth/guard";
import { mongoIdSchema, updateResumeSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { deleteResume } from "@/lib/services/resume";
import { getResumeDetail } from "@/lib/services/resume-queries";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/resumes/:id — the resume with every version and where each is used. */
export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);
    const limited = rateLimitResponse(`get-resume:${session.id}`, RATE_LIMITS.api);
    if (limited) return limited;

    await dbConnect();
    return successResponse({ resume: await getResumeDetail(id, session.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/resumes/:id — edit name, target role, notes, or archive. */
export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);
    const limited = rateLimitResponse(`update-resume:${session.id}`, RATE_LIMITS.api);
    if (limited) return limited;

    const validated = updateResumeSchema.parse(await request.json());
    await dbConnect();
    const resume = await Resume.findOneAndUpdate(
      { _id: id, userId: session.id },
      { $set: validated },
      { new: true, runValidators: true }
    );
    if (!resume) return errorResponse("Not found", 404);

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

/** DELETE /api/resumes/:id — delete the resume and all its versions. */
export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);
    const limited = rateLimitResponse(`delete-resume:${session.id}`, RATE_LIMITS.api);
    if (limited) return limited;

    await dbConnect();
    await deleteResume(id, session.id, request);
    return successResponse({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
