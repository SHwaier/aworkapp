import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import TimelineEvent from "@/models/TimelineEvent";
import Application from "@/models/Application";
import { requireAuth } from "@/lib/auth/guard";
import { applicationResumeUploadSchema, mongoIdSchema } from "@/lib/validators/schemas";
import { successResponse, handleApiError } from "@/lib/api/response";
import { readUpload } from "@/lib/api/multipart";
import { RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { uploadForApplication, versionLabel } from "@/lib/services/resume";
import { getApplicationResume } from "@/lib/services/resume-queries";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/applications/:id/resume/upload (multipart: file, mode, name?, note?)
 * mode "version": the next version of the assigned resume.
 * mode "new": a new resume (based on the assigned one, if any).
 * The application is then pinned to the uploaded version.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);
    const limited = rateLimitResponse(`app-resume-upload:${session.id}`, RATE_LIMITS.upload);
    if (limited) return limited;

    const { file, originalFileName, fields } = await readUpload(request);
    const { mode, name, note } = applicationResumeUploadSchema.parse(fields);

    await dbConnect();
    const { resume, version } = await uploadForApplication({
      applicationId: id,
      userId: session.id,
      file,
      originalFileName,
      mode,
      name,
      note,
      request,
    });

    const app = await Application.findOne({ _id: id, userId: session.id }).select(
      "currentStatus lifecycleStage"
    );
    await TimelineEvent.create({
      userId: session.id,
      applicationId: id,
      type: "document_submitted",
      title: "Resume uploaded",
      description: `${versionLabel(resume.name, version.versionNumber)} is now the resume for this application.`,
      eventDate: new Date(),
      relatedFileIds: [version._id],
      source: "system",
      statusAfterEvent: app?.currentStatus,
      lifecycleStageAfterEvent: app?.lifecycleStage,
    });

    return successResponse({ assigned: await getApplicationResume(id, session.id) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
