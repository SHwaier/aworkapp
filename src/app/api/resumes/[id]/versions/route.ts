import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/guard";
import { mongoIdSchema, resumeUploadFieldsSchema } from "@/lib/validators/schemas";
import { successResponse, handleApiError } from "@/lib/api/response";
import { readUpload } from "@/lib/api/multipart";
import { RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { addVersion } from "@/lib/services/resume";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** POST /api/resumes/:id/versions (multipart: file, note?) — upload the next version. */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);
    const limited = rateLimitResponse(`resume-version:${session.id}`, RATE_LIMITS.upload);
    if (limited) return limited;

    const { file, originalFileName, fields } = await readUpload(request);
    const { note } = resumeUploadFieldsSchema.parse(fields);

    await dbConnect();
    const { resume, version } = await addVersion({
      resumeId: id,
      userId: session.id,
      file,
      originalFileName,
      note,
      request,
    });
    return successResponse({ resume, version }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
