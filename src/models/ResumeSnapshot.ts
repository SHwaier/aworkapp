import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IResumeSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  baseResumeVersionId: mongoose.Types.ObjectId;
  finalSubmittedFileId: mongoose.Types.ObjectId | null;
  tailoringNotes: string;
  aiGeneratedChangeSummary: string;
  keywordsAdded: string[];
  keywordsMissing: string[];
  matchScore: number | null;
  manuallyEdited: boolean;
  promotedToBaseVersion: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSnapshotSchema = new Schema<IResumeSnapshot>(
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
    baseResumeVersionId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeVersion",
      required: true,
    },
    finalSubmittedFileId: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    tailoringNotes: { type: String, default: "", maxlength: 5000 },
    aiGeneratedChangeSummary: { type: String, default: "", maxlength: 5000 },
    keywordsAdded: [{ type: String, maxlength: 100 }],
    keywordsMissing: [{ type: String, maxlength: 100 }],
    matchScore: { type: Number, default: null, min: 0, max: 100 },
    manuallyEdited: { type: Boolean, default: false },
    promotedToBaseVersion: { type: Boolean, default: false },
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

ResumeSnapshotSchema.index({ userId: 1, applicationId: 1 });
ResumeSnapshotSchema.index({ userId: 1, baseResumeVersionId: 1 });

const ResumeSnapshot: Model<IResumeSnapshot> =
  mongoose.models.ResumeSnapshot ||
  mongoose.model<IResumeSnapshot>("ResumeSnapshot", ResumeSnapshotSchema);

export default ResumeSnapshot;
