import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ILoginAttempt extends Document {
  email: string;
  ip: string;
  success: boolean;
  userAgent: string;
  createdAt: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttempt>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  ip: {
    type: String,
    required: true,
    index: true,
  },
  success: {
    type: Boolean,
    required: true,
  },
  userAgent: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL: auto-delete after 24 hours
    index: { expires: 24 * 60 * 60 },
  },
});

// Compound indexes for efficient brute-force queries
LoginAttemptSchema.index({ email: 1, success: 1, createdAt: -1 });
LoginAttemptSchema.index({ ip: 1, success: 1, createdAt: -1 });

const LoginAttempt: Model<ILoginAttempt> =
  mongoose.models.LoginAttempt || mongoose.model<ILoginAttempt>("LoginAttempt", LoginAttemptSchema);

export default LoginAttempt;
