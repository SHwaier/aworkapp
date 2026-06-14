import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ISecurityBan extends Document {
  identifier: string; // e.g., "ip:192.168.1.1" or "email:test@example.com"
  type: "ip" | "email";
  value: string;
  failedCount: number;
  firstFailureAt: Date;
  lastFailureAt: Date;
  blockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SecurityBanSchema = new Schema<ISecurityBan>(
  {
    identifier: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, enum: ["ip", "email"] },
    value: { type: String, required: true },
    failedCount: { type: Number, default: 0 },
    firstFailureAt: { type: Date, default: Date.now },
    lastFailureAt: { type: Date, default: Date.now },
    blockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-expire documents after 24 hours of inactivity to keep the database clean
SecurityBanSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

const SecurityBan: Model<ISecurityBan> =
  mongoose.models.SecurityBan || mongoose.model<ISecurityBan>("SecurityBan", SecurityBanSchema);

export default SecurityBan;
