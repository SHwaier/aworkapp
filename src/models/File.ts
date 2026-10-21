import mongoose, { Schema, type Document, type Model } from "mongoose";
import { FILE_CATEGORIES } from "@/lib/validators/schemas";

export interface IFile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalFileName: string;
  displayName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  storageProvider: string;
  storageKey: string;
  fileHash: string;
  category: string;
  /** Set when this file is a version of a resume */
  resumeId: mongoose.Types.ObjectId | null;
  versionNumber: number | null;
  /** Optional note on what changed in this version */
  versionNote: string;
  /** Set when this version was created by restoring an older one */
  restoredFromVersion: number | null;
  /** Plain text extracted from PDF/DOCX for AI analysis (null until extracted) */
  extractedText: string | null;
  /** SHA-256 of extractedText, used to detect when an analysis is stale */
  textHash: string | null;
  textPageCount: number | null;
  textExtractedAt: Date | null;
  textExtractionError: string | null;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
      maxlength: 500,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    fileType: { type: String, required: true, maxlength: 20 },
    mimeType: { type: String, required: true, maxlength: 100 },
    fileSize: { type: Number, required: true },
    storageProvider: {
      type: String,
      enum: ["local", "s3", "r2"],
      default: "local",
    },
    // Security: never expose this to client
    storageKey: {
      type: String,
      required: true,
      select: false,
    },
    // Used for duplicate detection
    fileHash: { type: String, required: true },
    category: {
      type: String,
      enum: FILE_CATEGORIES,
      default: "other",
    },
    // Resume versioning
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", default: null, index: true },
    versionNumber: { type: Number, default: null, min: 1 },
    versionNote: { type: String, default: "", maxlength: 300 },
    restoredFromVersion: { type: Number, default: null },
    // Text extraction for AI analysis. Large, so not selected by default.
    extractedText: { type: String, default: null, select: false },
    textHash: { type: String, default: null },
    textPageCount: { type: Number, default: null },
    textExtractedAt: { type: Date, default: null },
    textExtractionError: { type: String, default: null, maxlength: 500 },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        // Security: never expose storage key to client
        delete ret.storageKey;
        delete ret.extractedText;
        return ret;
      },
    },
  }
);

// Indexes per PRD
FileSchema.index({ userId: 1, fileHash: 1 });
FileSchema.index({ userId: 1, category: 1 });
FileSchema.index({ userId: 1, uploadedAt: -1 });
// One file per version number within a resume
FileSchema.index(
  { resumeId: 1, versionNumber: 1 },
  { unique: true, partialFilterExpression: { resumeId: { $type: "objectId" } } }
);

const File: Model<IFile> = mongoose.models.File || mongoose.model<IFile>("File", FileSchema);

export default File;
