import mongoose, { Schema, type Document, type Model } from "mongoose";
import { NOTE_TYPES } from "@/lib/validators/schemas";

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
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
    type: {
      type: String,
      enum: NOTE_TYPES,
      default: "general",
    },
    title: { type: String, default: "", trim: true, maxlength: 300 },
    body: { type: String, required: true, maxlength: 10000 },
    pinned: { type: Boolean, default: false },
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

// Indexes per PRD
NoteSchema.index({ userId: 1, applicationId: 1, createdAt: -1 });
NoteSchema.index({ userId: 1, applicationId: 1, pinned: 1 });

const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);

export default Note;
