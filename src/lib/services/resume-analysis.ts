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
import JobProfile from "@/models/JobProfile";
import { AppError } from "@/lib/api/app-error";
import { AI_MODEL, AiError } from "@/lib/ai/client";
import {
  analyzeResumeMatch,
  jobFingerprintText,
  PROMPT_VERSION,
  type JobProfile as JobProfileData,
} from "@/lib/ai/analysis";
import { runFormatChecks } from "@/lib/ai/analysis/format-checks";
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
  /** Fingerprint of the job (cleaned text, title, company) for this prompt version and model */
  profileHash: string;
  /** Fingerprint of resume text + job: equal = the same analysis */
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
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const profileHash = sha256(
    [
      sha256(jobFingerprintText(jobDescription)),
      sha256(norm(jobTitle)),
      sha256(norm(companyName)),
      PROMPT_VERSION,
      AI_MODEL,
    ].join("|")
  );

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
      profileHash,
      inputHash: sha256([textHash, profileHash].join("|")),
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
    // Still analyzing exactly this resume and job: nothing new to start
    if (latest.inputHash === ctx.inputHash) return { analysis: latest, started: false, ctx };
    // The resume or job changed mid-run. The old run keeps going (and keeps its
    // charge) but steps aside so a run for the current inputs can start.
    await ResumeAnalysis.updateOne(
      { _id: latest._id, status: { $in: ["queued", "running"] } },
      { $set: { superseded: true }, $unset: { active: 1 } }
    );
  }
  // A result from the fallback model is reused only until the main model can redo it
  if (
    latest &&
    latest.status === "complete" &&
    latest.inputHash === ctx.inputHash &&
    !latest.usedFallback
  ) {
    return { analysis: latest, started: false, ctx };
  }

  // The same resume text was analyzed against the same job before, in any of the
  // user's applications: copy that result instead of calling the AI (free)
  const earlier = await ResumeAnalysis.findOne({
    userId,
    inputHash: ctx.inputHash,
    status: "complete",
    usedFallback: { $ne: true },
  }).sort({ createdAt: -1 });
  if (earlier) {
    return { analysis: await copyAnalysis(earlier, ctx), started: false, ctx };
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
      profileHash: ctx.profileHash,
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

/** Save an earlier result as this application's latest analysis, without an AI call. */
async function copyAnalysis(
  source: IResumeAnalysis,
  ctx: AnalysisContext
): Promise<IResumeAnalysis> {
  const src = source.toObject();
  // Same text, but page count comes from this file, so formatting checks are redone (no AI)
  const { text, pageCount } = await ensureFileText(ctx.fileId, ctx.userId);
  const now = new Date();
  const copy = await ResumeAnalysis.create({
    userId: ctx.userId,
    applicationId: ctx.applicationId,
    resumeId: ctx.resumeId,
    fileId: ctx.fileId,
    resumeVersionName: ctx.resumeVersionName,
    inputHash: ctx.inputHash,
    profileHash: ctx.profileHash,
    aiModel: src.aiModel,
    promptVersion: src.promptVersion,
    usedFallback: false,
    reusedFromId: src._id,
    status: "complete",
    quotaDay: null,
    score: src.score,
    summary: src.summary,
    requirements: src.requirements,
    keywords: src.keywords,
    // Done/dismissed is tracked per application, so suggestions start open again
    suggestions: src.suggestions.map((s: IResumeAnalysis["suggestions"][number]) => ({
      type: s.type,
      priority: s.priority,
      title: s.title,
      original: s.original,
      suggestedText: s.suggestedText,
      rationale: s.rationale,
      requiresVerification: s.requiresVerification,
      status: "open",
    })),
    formatChecks: runFormatChecks(text.split("\n").filter(Boolean), pageCount),
    insights: src.insights,
    insightsError: null,
    usage: { inputTokens: 0, outputTokens: 0, thoughtTokens: 0 },
    startedAt: now,
    completedAt: now,
  });
  await updateSnapshotScore(ctx, copy.score ?? 0, copy.keywords);
  return copy;
}

async function updateSnapshotScore(
  ctx: AnalysisContext,
  score: number,
  keywords: { term: string; inResume: boolean }[]
): Promise<void> {
  await ResumeSnapshot.updateOne(
    { applicationId: ctx.applicationId, userId: ctx.userId },
    {
      $set: {
        matchScore: score,
        keywordsMissing: keywords.filter((k) => !k.inResume).map((k) => k.term),
      },
    }
  );
}

/** The saved profile for this job, if the main model produced one */
async function findJobProfile(ctx: AnalysisContext): Promise<JobProfileData | null> {
  const doc = await JobProfile.findOne({
    userId: ctx.userId,
    profileHash: ctx.profileHash,
    usedFallback: false,
  }).lean();
  return (doc?.profile as JobProfileData | undefined) ?? null;
}

/** Save a new job profile. A fallback-made profile never replaces a main-model one. */
async function saveJobProfile(
  ctx: AnalysisContext,
  profile: JobProfileData,
  model: string,
  usedFallback: boolean
): Promise<void> {
  const fields = { profile, aiModel: model, promptVersion: PROMPT_VERSION, usedFallback };
  try {
    await JobProfile.updateOne(
      { userId: ctx.userId, profileHash: ctx.profileHash },
      usedFallback ? { $setOnInsert: fields } : { $set: fields },
      { upsert: true }
    );
  } catch (err) {
    // Another run saved it at the same moment
    if ((err as { code?: number }).code !== 11000) throw err;
  }
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
    const savedProfile = await findJobProfile(ctx);
    const { result, model, usage, usedFallback, profile, profileIsNew } = await analyzeResumeMatch({
      jobTitle: ctx.jobTitle,
      companyName: ctx.companyName,
      jobDescription: ctx.jobDescription,
      resumeText: text,
      pageCount,
      profile: savedProfile,
    });
    if (profileIsNew) await saveJobProfile(ctx, profile, model, usedFallback);

    analysis.set({
      status: "complete",
      active: undefined,
      aiModel: model,
      usedFallback,
      usage,
      score: result.score,
      summary: result.summary,
      requirements: result.requirements,
      keywords: result.keywords,
      suggestions: result.suggestions.map((s) => ({ ...s, status: "open" })),
      formatChecks: result.formatChecks,
      insights: result.insights,
      insightsError: null,
      completedAt: new Date(),
    });
    await analysis.save();
    // A run that was superseded mid-way is kept in history but isn't the current score
    const superseded = await ResumeAnalysis.exists({ _id: analysis._id, superseded: true });
    if (!superseded) await updateSnapshotScore(ctx, result.score, result.keywords);
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
  /** A run is in progress, but for a resume or job that has since changed */
  inProgressOutdated: boolean;
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
    // A fallback-model result counts as stale so the user can redo it on the main model
    upToDate: !!(
      context.ready &&
      latestComplete &&
      latestComplete.inputHash === context.ctx.inputHash &&
      !latestComplete.usedFallback
    ),
    inProgressOutdated: !!(
      context.ready &&
      analysis &&
      (analysis.status === "queued" || analysis.status === "running") &&
      analysis.inputHash !== context.ctx.inputHash
    ),
    quota,
  };
}

/**
 * Delete an application's analyses, and any saved job profile that no other
 * analysis of the user still uses (it's derived from that job's description).
 */
export async function deleteApplicationAnalyses(
  applicationId: string,
  userId: string
): Promise<void> {
  const hashes: string[] = (
    await ResumeAnalysis.distinct("profileHash", { applicationId, userId })
  ).filter(Boolean);
  await ResumeAnalysis.deleteMany({ applicationId, userId });
  if (hashes.length === 0) return;
  const stillUsed: string[] = await ResumeAnalysis.distinct("profileHash", {
    userId,
    profileHash: { $in: hashes },
  });
  const unused = hashes.filter((h) => !stillUsed.includes(h));
  if (unused.length) await JobProfile.deleteMany({ userId, profileHash: { $in: unused } });
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
