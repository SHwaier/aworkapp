import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/guard";
import { mongoIdSchema, versionNumberSchema } from "@/lib/validators/schemas";
import { successResponse, handleApiError } from "@/lib/api/response";
import { RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { restoreVersion } from "@/lib/services/resume";

interface RouteParams {
  params: Promise<{ id: string; version: string }>;
}

/** POST /api/resumes/:id/versions/:version/restore — copy an old version forward as the new current one. */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id, version } = await params;
    mongoIdSchema.parse(id);
    const versionNumber = versionNumberSchema.parse(version);
    const limited = rateLimitResponse(`resume-version-restore:${session.id}`, RATE_LIMITS.api);
    if (limited) return limited;

    await dbConnect();
    const { resume, version: created } = await restoreVersion({
      resumeId: id,
      userId: session.id,
      versionNumber,
      request,
    });
    return successResponse({ resume, version: created }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
