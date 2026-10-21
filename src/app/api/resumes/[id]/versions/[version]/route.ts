import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/guard";
import { mongoIdSchema, versionNumberSchema } from "@/lib/validators/schemas";
import { successResponse, handleApiError } from "@/lib/api/response";
import { RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { deleteVersion } from "@/lib/services/resume";

interface RouteParams {
  params: Promise<{ id: string; version: string }>;
}

/** DELETE /api/resumes/:id/versions/:version — delete an old, unused version. */
export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id, version } = await params;
    mongoIdSchema.parse(id);
    const versionNumber = versionNumberSchema.parse(version);
    const limited = rateLimitResponse(`resume-version-delete:${session.id}`, RATE_LIMITS.api);
    if (limited) return limited;

    await dbConnect();
    await deleteVersion({ resumeId: id, userId: session.id, versionNumber, request });
    return successResponse({ versionNumber });
  } catch (error) {
    return handleApiError(error);
  }
}
