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
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        // Security: never expose storage key to client
        delete ret.storageKey;
        return ret;
      },
    },
  }
);

// Indexes per PRD
FileSchema.index({ userId: 1, fileHash: 1 });
FileSchema.index({ userId: 1, category: 1 });
FileSchema.index({ userId: 1, uploadedAt: -1 });

const File: Model<IFile> =
  mongoose.models.File || mongoose.model<IFile>("File", FileSchema);

export default File;
