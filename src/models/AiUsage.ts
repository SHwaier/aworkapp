import mongoose, { Schema, type Document, type Model } from "mongoose";

/** Count of AI analyses a user has run on one UTC day. */
export interface IAiUsage extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** UTC date, YYYY-MM-DD */
  day: string;
  count: number;
  expireAt: Date;
}

const AiUsageSchema = new Schema<IAiUsage>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: String, required: true },
  count: { type: Number, default: 0, min: 0 },
  // Old counters are only needed briefly; MongoDB removes them after this date
  expireAt: { type: Date, required: true },
});

AiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });
AiUsageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const AiUsage: Model<IAiUsage> =
  mongoose.models.AiUsage || mongoose.model<IAiUsage>("AiUsage", AiUsageSchema);

export default AiUsage;
