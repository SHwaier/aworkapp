import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Application from "@/models/Application";
import ResumeSnapshot from "@/models/ResumeSnapshot";
import ResumeChecklist from "@/models/ResumeChecklist";
import File from "@/models/File";
import { createAuditLog } from "@/models/AuditLog";
import { requireAuth } from "@/lib/auth/session";
import { mongoIdSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { analyzeResume, computeScore } from "@/lib/services/checklist";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/applications/:id/resume/checklist
 * Returns the existing checklist for this application.
 */
export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id: applicationId } = await params;
    mongoIdSchema.parse(applicationId);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`checklist-get:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    const checklist = await ResumeChecklist.findOne({
      applicationId,
      userId: session.id,
    });

    if (!checklist) {
      return successResponse({ checklist: null });
    }

    return successResponse({ checklist });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/applications/:id/resume/checklist
 * Trigger analysis: extract resume text, generate checklist items + keywords.
 * Body: { resumeText?: string }
 * If resumeText is not provided, the server reads the DOCX file and extracts text.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id: applicationId } = await params;
    mongoIdSchema.parse(applicationId);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`checklist-post:${session.id || ip}`, RATE_LIMITS.strict);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.strict) }
      );
    }

    const body = await request.json().catch(() => ({}));
    let { resumeText } = body as { resumeText?: string };

    await dbConnect();

    // Verify application
    const app = await Application.findOne({
      _id: applicationId,
      userId: session.id,
    }).populate("companyId");
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    // Find resume snapshot to get the resume version
    const snapshot = await ResumeSnapshot.findOne({
      applicationId,
      userId: session.id,
    }).sort({ createdAt: -1 });
    if (!snapshot) {
      return errorResponse("No resume assigned to this application", 400);
    }

    // If no resumeText provided, try to read the file
    if (!resumeText) {
      // Find the file to read
      let fileId = snapshot.finalSubmittedFileId;
      if (!fileId) {
        const ResumeVersion = (await import("@/models/ResumeVersion")).default;
        const baseVersion = await ResumeVersion.findById(snapshot.baseResumeVersionId);
        fileId = baseVersion?.fileId || null;
      }

      if (fileId) {
        const fileDoc = await File.findById(fileId).select("+storageKey");
        if (fileDoc) {
          // Read file content for text extraction
          const provider = fileDoc.storageProvider;
          let buffer: Buffer | null = null;

          if (provider === "local") {
            const path = await import("path");
            const fs = await import("fs/promises");
            const storageDir = path.resolve(
              /*turbopackIgnore: true*/ process.cwd(),
              process.env.FILE_STORAGE_PATH || "./uploads"
            );
            const filePath = path.resolve(
              /*turbopackIgnore: true*/ process.cwd(),
              storageDir,
              fileDoc.storageKey
            );
            try {
              buffer = await fs.readFile(filePath);
            } catch {
              // File not readable
            }
          }

          // Basic text extraction from DOCX (parse XML content)
          if (buffer) {
            try {
              const JSZip = (await import("jszip")).default;
              const zip = await JSZip.loadAsync(buffer);
              const documentXml = zip.file("word/document.xml");
              if (documentXml) {
                const text = await documentXml.async("text");
                const xmlText = text
                  .replace(/<[^>]+>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                if (xmlText.length > 50) {
                  resumeText = xmlText;
                }
              }
            } catch {
              // Extraction failed
            }
          }
        }
      }
    }

    if (!resumeText) {
      resumeText = "";
    }

    // Truncate to prevent abuse
    if (resumeText.length > 50000) {
      resumeText = resumeText.slice(0, 50000);
    }

    const companyName =
      ((app.companyId as unknown as Record<string, unknown>)?.name as string) || "Company";

    // Hash calculation to prevent redundant analysis
    const crypto = await import("crypto");
    const hashPayload = `${resumeText}|${app.jobDescription || ""}`;
    const currentHash = crypto.createHash("sha256").update(hashPayload).digest("hex");

    let checklist = await ResumeChecklist.findOne({
      applicationId,
      userId: session.id,
    });

    if (checklist && checklist.lastAnalyzedHash === currentHash) {
      // Early return to prevent abuse / unnecessary AI calls
      return successResponse({ checklist });
    }

    // Run analysis
    const result = await analyzeResume({
      jobDescription: app.jobDescription || "",
      resumeText,
      jobTitle: app.jobTitle,
      companyName,
    });

    // Upsert checklist
    const score = computeScore(result.items.map((i) => ({ status: i.status || "not_started" })));

    if (checklist) {
      // Preserve user-set statuses and IDs for items that still exist
      const userStatuses = new Map<
        string,
        "not_started" | "in_progress" | "complete" | "needs_review" | "ignored" | "not_applicable"
      >();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userIds = new Map<string, any>();
      for (const item of checklist.items) {
        if (["complete", "ignored", "not_applicable"].includes(item.status)) {
          userStatuses.set(item.title, item.status);
        }
        userIds.set(item.title, item._id);
      }

      // Merge: keep user overrides and stable IDs
      const mergedItems = result.items.map((item) => {
        const prevId = userIds.get(item.title || "");
        const userStatus = userStatuses.get(item.title || "");
        const newItem = { ...item };
        if (prevId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (newItem as any)._id = prevId;
        }
        if (userStatus) {
          newItem.status = userStatus;
        }
        return newItem;
      });

      checklist.items = mergedItems as IChecklistItemType[];
      checklist.keywords = result.keywords as IChecklistKeywordType[];
      checklist.overallScore = computeScore(
        mergedItems.map((i) => ({ status: i.status || "not_started" }))
      );
      checklist.lastAnalyzedAt = new Date();
      checklist.resumeVersionId = snapshot.baseResumeVersionId;
      checklist.lastAnalyzedHash = currentHash;
      await checklist.save();
    } else {
      checklist = await ResumeChecklist.create({
        userId: session.id,
        applicationId,
        resumeVersionId: snapshot.baseResumeVersionId,
        items: result.items,
        keywords: result.keywords,
        overallScore: score,
        lastAnalyzedAt: new Date(),
        lastAnalyzedHash: currentHash,
      });
    }

    await createAuditLog({
      userId: session.id,
      action: "checklist.generated",
      entityType: "checklist",
      entityId: checklist._id.toString(),
      metadata: { applicationId, score, itemsCount: result.items.length },
      request,
    });

    return successResponse({ checklist });
  } catch (error) {
    return handleApiError(error);
  }
}

// Type aliases for the merged items — Mongoose accepts partials for subdoc arrays
type IChecklistItemType = InstanceType<typeof ResumeChecklist>["items"][number];
type IChecklistKeywordType = InstanceType<typeof ResumeChecklist>["keywords"][number];
