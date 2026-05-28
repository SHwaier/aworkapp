import mongoose, { Schema, type Document, type Model } from "mongoose";
import {
  APPLICATION_STATUSES,
  LIFECYCLE_STAGES,
  WORK_MODES,
  EMPLOYMENT_TYPES,
  JOB_SOURCES,
} from "@/lib/validators/schemas";

export interface IApplication extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  jobTitle: string;
  jobDescription: string;
  jobUrl: string;
  applicationUrl: string;
  source: string;
  location: string;
  workMode: string;
  employmentType: string;
  seniorityLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  datePosted: Date | null;
  applicationDeadline: Date | null;
  appliedAt: Date | null;
  lastCheckedAt: Date | null;
  currentStatus: string;
  lifecycleStage: string;
  nextAction: string;
  nextActionDueAt: Date | null;
  priority: number;
  tags: string[];
  outcome: string;
  rejectionReason: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    jobDescription: { type: String, default: "", maxlength: 50000 },
    jobUrl: { type: String, default: "", maxlength: 2000 },
    applicationUrl: { type: String, default: "", maxlength: 2000 },
    source: {
      type: String,
      enum: JOB_SOURCES,
      default: "Other",
    },
    location: { type: String, default: "", maxlength: 200 },
    workMode: { type: String, enum: [...WORK_MODES, ""], default: "" },
    employmentType: {
      type: String,
      enum: [...EMPLOYMENT_TYPES, ""],
      default: "",
    },
    seniorityLevel: { type: String, default: "", maxlength: 100 },
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    currency: { type: String, default: "USD", maxlength: 3 },
    datePosted: { type: Date, default: null },
    applicationDeadline: { type: Date, default: null },
    appliedAt: { type: Date, default: null },
    lastCheckedAt: { type: Date, default: null },
    currentStatus: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: "Saved",
    },
    lifecycleStage: {
      type: String,
      enum: LIFECYCLE_STAGES,
      default: "Saved",
    },
    nextAction: { type: String, default: "", maxlength: 500 },
    nextActionDueAt: { type: Date, default: null },
    priority: { type: Number, default: 0, min: 0, max: 5 },
    tags: [{ type: String, maxlength: 50 }],
    outcome: { type: String, default: "", maxlength: 500 },
    rejectionReason: { type: String, default: "", maxlength: 2000 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes per PRD recommendations
ApplicationSchema.index({ userId: 1, createdAt: -1 });
ApplicationSchema.index({ userId: 1, companyId: 1 });
ApplicationSchema.index({ userId: 1, currentStatus: 1 });
ApplicationSchema.index({ userId: 1, lifecycleStage: 1 });
ApplicationSchema.index({ userId: 1, appliedAt: -1 });
ApplicationSchema.index({ userId: 1, nextActionDueAt: 1 });
ApplicationSchema.index({ userId: 1, tags: 1 });

const Application: Model<IApplication> =
  mongoose.models.Application ||
  mongoose.model<IApplication>("Application", ApplicationSchema);

export default Application;
