import mongoose, { Schema, type Document, type Model } from "mongoose";

/** App-wide settings managed by admins. A single document with key "global". */
export interface IAppSettings extends Document {
  _id: mongoose.Types.ObjectId;
  key: "global";
  /** Default number of AI analyses each member can run per day (UTC) */
  aiDailyLimit: number;
  /** When true, admins have no daily AI limit */
  aiExemptAdmins: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_AI_DAILY_LIMIT = 20;
export const MAX_AI_DAILY_LIMIT = 1000;

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    key: { type: String, enum: ["global"], default: "global", unique: true },
    aiDailyLimit: {
      type: Number,
      default: DEFAULT_AI_DAILY_LIMIT,
      min: 0,
      max: MAX_AI_DAILY_LIMIT,
    },
    aiExemptAdmins: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AppSettings: Model<IAppSettings> =
  mongoose.models.AppSettings || mongoose.model<IAppSettings>("AppSettings", AppSettingsSchema);

export default AppSettings;

/** Load the global settings, creating them with defaults on first use. */
export async function getAppSettings(): Promise<IAppSettings> {
  return AppSettings.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).orFail();
}
