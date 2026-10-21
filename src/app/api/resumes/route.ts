import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/guard";
import { resumeUploadFieldsSchema } from "@/lib/validators/schemas";
import { successResponse, handleApiError } from "@/lib/api/response";
import { readUpload } from "@/lib/api/multipart";
import { RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { createResume } from "@/lib/services/resume";
import { listResumes } from "@/lib/services/resume-queries";

/**
 * GET /api/resumes?archived=true&search=...
 * The user's resumes with their current version, version count, usage, and best match score.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const limited = rateLimitResponse(`api-resumes:${session.id}`, RATE_LIMITS.api);
    if (limited) return limited;

    await dbConnect();
    const url = new URL(request.url);
    const resumes = await listResumes(session.id, {
      includeArchived: url.searchParams.get("archived") === "true",
      search: url.searchParams.get("search") ?? "",
    });
    return successResponse({ resumes, total: resumes.length });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/resumes (multipart: file, name?, targetRole?)
 * Create a resume from an uploaded file, which becomes v1.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const limited = rateLimitResponse(`create-resume:${session.id}`, RATE_LIMITS.upload);
    if (limited) return limited;

    const { file, originalFileName, fields } = await readUpload(request);
    const meta = resumeUploadFieldsSchema.parse(fields);

    await dbConnect();
    const { resume, version } = await createResume({
      userId: session.id,
      file,
      originalFileName,
      name: meta.name,
      targetRole: meta.targetRole,
      request,
    });
    return successResponse({ resume, version }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
