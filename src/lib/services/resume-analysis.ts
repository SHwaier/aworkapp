import { createHash } from "crypto";
import mongoose from "mongoose";
import Application from "@/models/Application";
import ResumeSnapshot from "@/models/ResumeSnapshot";
import Resume from "@/models/Resume";
import File from "@/models/File";
import ResumeAnalysis, {
  type IResumeAnalysis,
  type SuggestionStatus,
} from "@/models/ResumeAnalysis";
import { AppError } from "@/lib/api/app-error";
import { AI_MODEL, AiError } from "@/lib/ai/client";
import { analyzeResumeMatch, PROMPT_VERSION } from "@/lib/ai/analysis";
import {
  consumeAiQuota,
  getAiQuota,
  refundAiQuota,
  utcDay,
  type AiQuotaStatus,
} from "@/lib/ai/quota";
import { ensureFileText } from "@/lib/services/file";
import { versionLabel } from "@/lib/services/resume";

/** A queued/running analysis older than this is assumed dead (e.g. server restart). */
const STALE_RUN_MS = 5 * 60_000;
const HISTORY_LIMIT = 10;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface AnalysisContext {
  applicationId: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  resumeId: mongoose.Types.ObjectId;
  resumeVersionName: string;
  fileId: mongoose.Types.ObjectId;
  textHash: string;
  inputHash: string;
}

type ContextResult = { ready: true; ctx: AnalysisContext } | { ready: false; reason: string };

/**
 * Gather everything an analysis depends on, or explain why one can't run yet.
 * Extracts resume text on first use for files uploaded before extraction existed.
 */
export async function loadAnalysisContext(
  applicationId: string,
  userId: string
): Promise<ContextResult> {
  const app = await Application.findOne({ _id: applicationId, userId })
    .populate("companyId", "name")
    .lean();
  if (!app) throw new AppError("Application not found", 404);

  const jobDescription = (app.jobDescription || "").trim();
  if (jobDescription.length < 50) {
    return {
      ready: false,
      reason: "Add the job description to this application to analyze your resume against it.",
    };
  }

  const snapshot = await ResumeSnapshot.findOne({ applicationId, userId }).lean();
  if (!snapshot) {
    return { ready: false, reason: "Assign a resume to this application first." };
  }

  const resume = await Resume.findOne({ _id: snapshot.resumeId, userId }).select("name").lean();
  const fileId = snapshot.fileId;
  const file = await File.findOne({ _id: fileId, userId })
    .select("versionNumber textHash textExtractedAt textExtractionError")
    .lean();
  if (!resume || !file) {
    return { ready: false, reason: "The assigned resume's file is missing. Assign it again." };
  }
  let textHash = file?.textHash ?? null;
  if (!file?.textExtractedAt) {
    try {
      textHash = (await ensureFileText(fileId, userId)).textHash;
    } catch (err) {
      if (err instanceof AppError) return { ready: false, reason: err.message };
      throw err;
    }
  }
  if (!textHash) {
    return {
      ready: false,
      reason: file?.textExtractionError || "We couldn't read any text from the assigned resume.",
    };
  }

  const jobTitle = app.jobTitle || "";
  const companyName = (app.companyId as unknown as { name?: string } | null)?.name || "the company";

  return {
    ready: true,
    ctx: {
      applicationId,
      userId,
      jobTitle,
      companyName,
      jobDescription,
      resumeId: resume._id,
      resumeVersionName: versionLabel(resume.name, file.versionNumber ?? null),
      fileId,
      textHash,
      inputHash: sha256(
        [
          textHash,
          sha256(jobTitle),
          sha256(companyName),
          sha256(jobDescription),
          PROMPT_VERSION,
          AI_MODEL,
        ].join("|")
      ),
    },
  };
}

/** Mark queued/running analyses that never finished as failed, refunding their quota. */
async function expireStaleRuns(applicationId: string, userId: string): Promise<void> {
  const stale = await ResumeAnalysis.find({
    applicationId,
    userId,
    status: { $in: ["queued", "running"] },
    createdAt: { $lt: new Date(Date.now() - STALE_RUN_MS) },
  })
    .select("_id quotaDay")
    .lean();

  for (const run of stale) {
    // Conditional update so a concurrent request can't refund the same run twice
    const res = await ResumeAnalysis.updateOne(
      { _id: run._id, status: { $in: ["queued", "running"] } },
      {
        $set: {
          status: "failed",
          error: "The analysis didn't finish. Please try again.",
          completedAt: new Date(),
        },
        $unset: { active: 1 },
      }
    );
    if (res.modifiedCount && run.quotaDay) await refundAiQuota(userId, run.quotaDay);
  }
}

function latestAnalysis(applicationId: string, userId: string) {
  return ResumeAnalysis.findOne({ applicationId, userId }).sort({ createdAt: -1 });
}

export interface StartResult {
  analysis: IResumeAnalysis;
  /** True when a new run was queued (and charged); false when an existing result was reused */
  started: boolean;
  ctx: AnalysisContext;
}

/**
 * Start an analysis unless an identical one already exists or one is in progress.
 * Only new runs count against the daily AI limit.
 */
export async function startAnalysis(applicationId: string, userId: string): Promise<StartResult> {
  const result = await loadAnalysisContext(applicationId, userId);
  if (!result.ready) throw new AppError(result.reason, 400);
  const { ctx } = result;

  await expireStaleRuns(applicationId, userId);

  const latest = await latestAnalysis(applicationId, userId);
  if (latest && (latest.status === "queued" || latest.status === "running")) {
    return { analysis: latest, started: false, ctx };
  }
  if (latest && latest.status === "complete" && latest.inputHash === ctx.inputHash) {
    return { analysis: latest, started: false, ctx };
  }

  const quotaDay = utcDay();
  await consumeAiQuota(userId);

  let analysis: IResumeAnalysis;
  try {
    analysis = await ResumeAnalysis.create({
      userId,
      applicationId,
      resumeId: ctx.resumeId,
      fileId: ctx.fileId,
      resumeVersionName: ctx.resumeVersionName,
      inputHash: ctx.inputHash,
      aiModel: AI_MODEL,
      promptVersion: PROMPT_VERSION,
      status: "queued",
      active: true,
      quotaDay,
    });
  } catch (err) {
    // Another request started a run for this application in the meantime: use that one
    await refundAiQuota(userId, quotaDay);
    if ((err as { code?: number }).code === 11000) {
      const existing = await latestAnalysis(applicationId, userId);
      if (existing) return { analysis: existing, started: false, ctx };
    }
    throw err;
  }

  return { analysis, started: true, ctx };
}

/** Run a queued analysis to completion. Never throws; failures are recorded on the document. */
export async function runAnalysis(
  analysisId: mongoose.Types.ObjectId,
  ctx: AnalysisContext
): Promise<void> {
  const analysis = await ResumeAnalysis.findOneAndUpdate(
    { _id: analysisId, status: "queued" },
    { $set: { status: "running", startedAt: new Date() } },
    { new: true }
  );
  if (!analysis) return;

  try {
    const { text, pageCount } = await ensureFileText(ctx.fileId, ctx.userId);
    const { result, model, usage, insightsError } = await analyzeResumeMatch({
      jobTitle: ctx.jobTitle,
      companyName: ctx.companyName,
      jobDescription: ctx.jobDescription,
      resumeText: text,
      pageCount,
    });

    analysis.set({
      status: "complete",
      active: undefined,
      aiModel: model,
      usage,
      score: result.score,
      summary: result.summary,
      requirements: result.requirements,
      keywords: result.keywords,
      suggestions: result.suggestions.map((s) => ({ ...s, status: "open" })),
      formatChecks: result.formatChecks,
      insights: result.insights,
      insightsError,
      completedAt: new Date(),
    });
    await analysis.save();

    await ResumeSnapshot.updateOne(
      { applicationId: ctx.applicationId, userId: ctx.userId },
      {
        $set: {
          matchScore: result.score,
          keywordsMissing: result.keywords.filter((k) => !k.inResume).map((k) => k.term),
        },
      }
    );
  } catch (err) {
    if (!(err instanceof AiError) || !err.retryable) {
      console.error("Resume analysis failed:", err);
    }
    analysis.set({
      status: "failed",
      active: undefined,
      error:
        err instanceof AiError || err instanceof AppError
          ? err.message
          : "Something went wrong while analyzing your resume. Please try again.",
      completedAt: new Date(),
    });
    await analysis.save();
    if (analysis.quotaDay) await refundAiQuota(ctx.userId, analysis.quotaDay);
  }
}

export interface AnalysisOverview {
  analysis: IResumeAnalysis | null;
  /** Most recent complete analysis when the latest one is still running or failed */
  lastComplete: IResumeAnalysis | null;
  history: Array<{
    id: string;
    score: number | null;
    status: string;
    resumeVersionName: string;
    createdAt: Date;
  }>;
  /** Whether an analysis can run now, and if not, why */
  ready: boolean;
  reason: string | null;
  /** True when the latest complete analysis already reflects the current resume and job */
  upToDate: boolean;
  quota: AiQuotaStatus;
}

export async function getAnalysisOverview(
  applicationId: string,
  userId: string
): Promise<AnalysisOverview> {
  await expireStaleRuns(applicationId, userId);

  const [context, analysis, history, quota] = await Promise.all([
    loadAnalysisContext(applicationId, userId),
    latestAnalysis(applicationId, userId),
    ResumeAnalysis.find({ applicationId, userId, status: "complete" })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .select("score status resumeVersionName createdAt")
      .lean(),
    getAiQuota(userId),
  ]);

  const latestComplete =
    analysis?.status === "complete"
      ? analysis
      : await ResumeAnalysis.findOne({ applicationId, userId, status: "complete" }).sort({
          createdAt: -1,
        });

  return {
    analysis,
    lastComplete: analysis?.status === "complete" ? null : latestComplete,
    history: history.map((h) => ({
      id: h._id.toString(),
      score: h.score,
      status: h.status,
      resumeVersionName: h.resumeVersionName,
      createdAt: h.createdAt,
    })),
    ready: context.ready,
    reason: context.ready ? null : context.reason,
    upToDate: !!(
      context.ready &&
      latestComplete &&
      latestComplete.inputHash === context.ctx.inputHash
    ),
    quota,
  };
}

export async function updateSuggestionStatus(
  applicationId: string,
  userId: string,
  suggestionId: string,
  status: SuggestionStatus
): Promise<void> {
  const res = await ResumeAnalysis.updateOne(
    { applicationId, userId, "suggestions._id": suggestionId },
    { $set: { "suggestions.$.status": status } }
  );
  if (!res.matchedCount) throw new AppError("Suggestion not found", 404);
}
