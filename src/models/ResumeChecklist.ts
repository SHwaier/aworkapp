import mongoose, { Schema, type Document, type Model } from "mongoose";

// ─── Subdocument interfaces ───

export interface IChecklistItem {
  _id: mongoose.Types.ObjectId;
  category:
    | "job_match"
    | "ats_formatting"
    | "header"
    | "education"
    | "skills"
    | "projects"
    | "experience"
    | "bullet_quality"
    | "action_verbs"
    | "final_review";
  title: string;
  description: string;
  status:
    | "not_started"
    | "in_progress"
    | "complete"
    | "needs_review"
    | "ignored"
    | "not_applicable";
  severity: "info" | "suggestion" | "warning" | "critical";
  isAutoDetected: boolean;
  isUserDismissible: boolean;
  relatedKeyword: string;
  relatedResumeSection: string;
  suggestion: string;
}

export interface IChecklistKeyword {
  _id: mongoose.Types.ObjectId;
  keyword: string;
  category:
    | "technical_skill"
    | "tool"
    | "soft_skill"
    | "domain"
    | "role_keyword"
    | "certification"
    | "education"
    | "other";
  requirementLevel: "required" | "preferred" | "nice_to_have" | "unknown";
  appearsInJob: boolean;
  appearsInResume: boolean;
  recommendation:
    | "keep"
    | "safe_to_add"
    | "add_only_if_true"
    | "unsupported"
    | "not_relevant";
  frequency: number;
}

// ─── Main document interface ───

export interface IResumeChecklist extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  resumeVersionId: mongoose.Types.ObjectId;
  items: IChecklistItem[];
  keywords: IChecklistKeyword[];
  overallScore: number;
  lastAnalyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Subdocument schemas ───

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    category: {
      type: String,
      enum: [
        "job_match",
        "ats_formatting",
        "header",
        "education",
        "skills",
        "projects",
        "experience",
        "bullet_quality",
        "action_verbs",
        "final_review",
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 500 },
    description: { type: String, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: [
        "not_started",
        "in_progress",
        "complete",
        "needs_review",
        "ignored",
        "not_applicable",
      ],
      default: "not_started",
    },
    severity: {
      type: String,
      enum: ["info", "suggestion", "warning", "critical"],
      default: "suggestion",
    },
    isAutoDetected: { type: Boolean, default: true },
    isUserDismissible: { type: Boolean, default: true },
    relatedKeyword: { type: String, default: "", maxlength: 200 },
    relatedResumeSection: { type: String, default: "", maxlength: 200 },
    suggestion: { type: String, default: "", maxlength: 2000 },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

const ChecklistKeywordSchema = new Schema<IChecklistKeyword>(
  {
    keyword: { type: String, required: true, maxlength: 200 },
    category: {
      type: String,
      enum: [
        "technical_skill",
        "tool",
        "soft_skill",
        "domain",
        "role_keyword",
        "certification",
        "education",
        "other",
      ],
      default: "other",
    },
    requirementLevel: {
      type: String,
      enum: ["required", "preferred", "nice_to_have", "unknown"],
      default: "unknown",
    },
    appearsInJob: { type: Boolean, default: false },
    appearsInResume: { type: Boolean, default: false },
    recommendation: {
      type: String,
      enum: ["keep", "safe_to_add", "add_only_if_true", "unsupported", "not_relevant"],
      default: "unsupported",
    },
    frequency: { type: Number, default: 1, min: 0 },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// ─── Main document schema ───

const ResumeChecklistSchema = new Schema<IResumeChecklist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    resumeVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeVersion",
      required: true,
    },
    items: [ChecklistItemSchema],
    keywords: [ChecklistKeywordSchema],
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    lastAnalyzedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ResumeChecklistSchema.index({ userId: 1, applicationId: 1 }, { unique: true });
ResumeChecklistSchema.index({ userId: 1, resumeVersionId: 1 });

const ResumeChecklist: Model<IResumeChecklist> =
  mongoose.models.ResumeChecklist ||
  mongoose.model<IResumeChecklist>("ResumeChecklist", ResumeChecklistSchema);

export default ResumeChecklist;
