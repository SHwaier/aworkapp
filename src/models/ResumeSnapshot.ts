import mongoose, { Schema, type Document, type Model } from "mongoose";

/**
 * The resume an application uses. Pinned to one exact version (`fileId`), so
 * the record of what was sent doesn't change when the resume gets new versions.
 * Locked once the application is marked Applied.
 */
export interface IResumeSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  resumeId: mongoose.Types.ObjectId;
  /** The pinned version: a File with resumeId === this.resumeId */
  fileId: mongoose.Types.ObjectId;
  keywordsMissing: string[];
  matchScore: number | null;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSnapshotSchema = new Schema<IResumeSnapshot>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true },
    fileId: { type: Schema.Types.ObjectId, ref: "File", required: true },
    keywordsMissing: [{ type: String, maxlength: 100 }],
    matchScore: { type: Number, default: null, min: 0, max: 100 },
    isLocked: { type: Boolean, default: false },
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

ResumeSnapshotSchema.index({ userId: 1, applicationId: 1 }, { unique: true });
ResumeSnapshotSchema.index({ userId: 1, resumeId: 1 });
ResumeSnapshotSchema.index({ fileId: 1 });

const ResumeSnapshot: Model<IResumeSnapshot> =
  mongoose.models.ResumeSnapshot ||
  mongoose.model<IResumeSnapshot>("ResumeSnapshot", ResumeSnapshotSchema);

export default ResumeSnapshot;
