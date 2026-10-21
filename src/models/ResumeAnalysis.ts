import mongoose, { Schema, type Document, type Model } from "mongoose";
import type {
  AnalysisInsights,
  AnalysisKeyword,
  AnalysisRequirement,
  AnalysisSuggestion,
  FormatCheck,
} from "@/lib/ai/analysis/types";

export const ANALYSIS_STATUSES = ["queued", "running", "complete", "failed"] as const;
export const SUGGESTION_STATUSES = ["open", "done", "dismissed"] as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export interface IStoredSuggestion extends AnalysisSuggestion {
  _id: mongoose.Types.ObjectId;
  status: SuggestionStatus;
}

/** One AI match analysis of a resume version against an application's job. */
export interface IResumeAnalysis extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  resumeVersionId: mongoose.Types.ObjectId;
  fileId: mongoose.Types.ObjectId;
  /** Snapshot of the resume version's name at analysis time, for the history list */
  resumeVersionName: string;
  /** Hash of everything that determines the result; equal hash = nothing changed */
  inputHash: string;
  aiModel: string;
  promptVersion: string;
  status: AnalysisStatus;
  /** Set while queued/running; a partial unique index allows one active run per application */
  active?: boolean;
  error: string | null;
  /** UTC day the run was charged to, so a failed run can be refunded */
  quotaDay: string | null;
  score: number | null;
  summary: string;
  requirements: AnalysisRequirement[];
  keywords: AnalysisKeyword[];
  suggestions: IStoredSuggestion[];
  formatChecks: FormatCheck[];
  /** Role benchmarks and action plan; null for older analyses or if generation failed */
  insights: AnalysisInsights | null;
  insightsError: string | null;
  usage: { inputTokens: number; outputTokens: number; thoughtTokens?: number };
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RequirementSchema = new Schema<AnalysisRequirement>(
  {
    text: String,
    category: {
      type: String,
      enum: ["skill", "experience", "education", "responsibility", "other"],
      default: "other",
    },
    importance: { type: String, enum: ["required", "preferred"] },
    coverage: { type: String, enum: ["met", "partial", "missing"] },
    claimedCoverage: { type: String, enum: ["met", "partial", "missing"] },
    evidence: String,
    evidenceVerified: Boolean,
    note: String,
  },
  { _id: false }
);

const KeywordSchema = new Schema<AnalysisKeyword>(
  {
    term: String,
    importance: { type: String, enum: ["required", "preferred"] },
    inResume: Boolean,
  },
  { _id: false }
);

const SuggestionSchema = new Schema<IStoredSuggestion>({
  type: {
    type: String,
    enum: ["rewrite_bullet", "add_keyword", "add_content", "remove_content", "reorder", "wording"],
  },
  priority: { type: String, enum: ["high", "medium", "low"] },
  title: String,
  original: String,
  suggestedText: String,
  rationale: String,
  requiresVerification: Boolean,
  status: { type: String, enum: SUGGESTION_STATUSES, default: "open" },
});

const FormatCheckSchema = new Schema<FormatCheck>(
  {
    id: String,
    label: String,
    status: { type: String, enum: ["pass", "warn"] },
    detail: String,
  },
  { _id: false }
);

const LEVELS = ["high", "medium", "low"];

const InsightsSchema = new Schema<AnalysisInsights>(
  {
    seniority: { type: String, enum: ["entry", "mid", "senior", "lead", "unknown"] },
    roleSummary: String,
    benchmarks: [
      new Schema(
        {
          area: {
            type: String,
            enum: [
              "summary",
              "skills",
              "experience",
              "projects",
              "education",
              "keywords",
              "formatting",
            ],
          },
          title: String,
          typical: String,
          yourStatus: { type: String, enum: ["strong", "adequate", "weak", "missing"] },
          gap: String,
          examples: [String],
        },
        { _id: false }
      ),
    ],
    actionPlan: [
      new Schema(
        {
          title: String,
          detail: String,
          impact: { type: String, enum: LEVELS },
          effort: { type: String, enum: LEVELS },
          relatedRequirement: String,
        },
        { _id: false }
      ),
    ],
  },
  { _id: false }
);

const ResumeAnalysisSchema = new Schema<IResumeAnalysis>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    resumeVersionId: { type: Schema.Types.ObjectId, ref: "ResumeVersion", required: true },
    fileId: { type: Schema.Types.ObjectId, ref: "File", required: true },
    resumeVersionName: { type: String, default: "" },
    inputHash: { type: String, required: true },
    aiModel: { type: String, required: true },
    promptVersion: { type: String, required: true },
    status: { type: String, enum: ANALYSIS_STATUSES, default: "queued" },
    active: { type: Boolean },
    error: { type: String, default: null },
    quotaDay: { type: String, default: null },
    score: { type: Number, default: null, min: 0, max: 100 },
    summary: { type: String, default: "" },
    requirements: [RequirementSchema],
    keywords: [KeywordSchema],
    suggestions: [SuggestionSchema],
    formatChecks: [FormatCheckSchema],
    insights: { type: InsightsSchema, default: null },
    insightsError: { type: String, default: null },
    usage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      thoughtTokens: { type: Number, default: 0 },
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        delete ret.quotaDay;
        delete ret.inputHash;
        delete ret.active;
        if (Array.isArray(ret.suggestions)) {
          ret.suggestions = (ret.suggestions as Record<string, unknown>[]).map(
            ({ _id, ...rest }) => ({ id: String(_id), ...rest })
          );
        }
        return ret;
      },
    },
  }
);

ResumeAnalysisSchema.index({ userId: 1, applicationId: 1, createdAt: -1 });
ResumeAnalysisSchema.index(
  { applicationId: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: "one_active_run_per_application",
  }
);

const ResumeAnalysis: Model<IResumeAnalysis> =
  mongoose.models.ResumeAnalysis ||
  mongoose.model<IResumeAnalysis>("ResumeAnalysis", ResumeAnalysisSchema);

export default ResumeAnalysis;
