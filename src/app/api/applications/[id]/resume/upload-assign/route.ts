import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Application from "@/models/Application";
import ResumeVersion from "@/models/ResumeVersion";
import ResumeSnapshot from "@/models/ResumeSnapshot";
import TimelineEvent from "@/models/TimelineEvent";
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
import { uploadFile } from "@/lib/services/file";
import { assignResumeToApplication } from "@/lib/services/resume";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/applications/:id/resume/upload-assign
 * Refactored composite upload-assign endpoint using local service modules.
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
    const rateLimit = checkRateLimit(`upload-assign-resume:${session.id || ip}`, RATE_LIMITS.upload);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many upload attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.upload) }
      );
    }

    await dbConnect();

    // 1. Verify Application exists and belongs to the user
    const app = await Application.findOne({ _id: applicationId, userId: session.id }).populate("companyId");
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    // 2. Parse Form Data
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file || !(file instanceof Blob)) {
      return errorResponse("No file uploaded", 400);
    }

    const originalFileName = (file as any).name || "resume.pdf";

    // 3. Upload file using the shared file service
    const { file: fileDoc } = await uploadFile({
      file,
      originalFileName,
      userId: session.id,
      category: "resume",
      request,
    });

    // 4. Create Targeted ResumeVersion
    const companyName = (app.companyId as any)?.name || "Target Company";
    const resumeName = `${companyName} Resume - v1`;
    const targetIndustry = (app.companyId as any)?.industry || "";

    const resumeVersion = await ResumeVersion.create({
      userId: session.id,
      name: resumeName,
      versionNumber: 1,
      targetRole: app.jobTitle || "Software Engineer",
      targetIndustry,
      skillsEmphasized: [],
      experienceEmphasized: [],
      projectEmphasized: [],
      fileId: fileDoc._id,
      notes: `Tailored resume version created automatically on upload for application at ${companyName}.`,
      isActive: true,
    });

    // 5. Link to Application using the shared resume service
    await assignResumeToApplication({
      applicationId,
      resumeVersionId: resumeVersion._id.toString(),
      userId: session.id,
      request,
    });

    // 6. Log System Timeline Event
    await TimelineEvent.create({
      userId: session.id,
      applicationId: app._id,
      type: "document_submitted",
      title: "Resume uploaded & assigned",
      description: `"${fileDoc.displayName}" uploaded and assigned as the tailored resume for this application.`,
      eventDate: new Date(),
      relatedFileIds: [fileDoc._id],
      source: "system",
      statusAfterEvent: app.currentStatus,
      lifecycleStageAfterEvent: app.lifecycleStage,
    });

    // Fetch fully populated snapshot to return
    const populatedSnapshot = await ResumeSnapshot.findOne({ applicationId, userId: session.id })
      .populate({
        path: "baseResumeVersionId",
        populate: { path: "fileId", select: "displayName fileType mimeType fileSize" },
      })
      .populate("finalSubmittedFileId", "displayName fileType mimeType fileSize")
      .lean();

    return successResponse({ resumeSnapshot: populatedSnapshot }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
