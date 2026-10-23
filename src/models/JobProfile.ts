import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { JobProfile as JobProfileData } from "@/lib/ai/analysis/types";

/**
 * The AI's reading of one job (requirements, keywords, benchmarks), saved so
 * later analyses of other resume versions reuse it instead of re-reading the job.
 * Keyed per user by a fingerprint of the cleaned job text, title, company,
 * prompt version, and model; never shared between users.
 */
export interface IJobProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileHash: string;
  aiModel: string;
  promptVersion: string;
  /** Produced by the fallback model; replaced when the main model succeeds */
  usedFallback: boolean;
  profile: JobProfileData;
  createdAt: Date;
  updatedAt: Date;
}

const JobProfileSchema = new Schema<IJobProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    profileHash: { type: String, required: true },
    aiModel: { type: String, required: true },
    promptVersion: { type: String, required: true },
    usedFallback: { type: Boolean, default: false },
    profile: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

JobProfileSchema.index({ userId: 1, profileHash: 1 }, { unique: true });

const JobProfile: Model<IJobProfile> =
  mongoose.models.JobProfile || mongoose.model<IJobProfile>("JobProfile", JobProfileSchema);

export default JobProfile;
