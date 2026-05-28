import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IResumeVersion extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  versionNumber: number;
  targetRole: string;
  targetIndustry: string;
  skillsEmphasized: string[];
  experienceEmphasized: string[];
  projectEmphasized: string[];
  fileId: mongoose.Types.ObjectId | null;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeVersionSchema = new Schema<IResumeVersion>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    versionNumber: { type: Number, default: 1, min: 1 },
    targetRole: { type: String, default: "", maxlength: 200 },
    targetIndustry: { type: String, default: "", maxlength: 200 },
    skillsEmphasized: [{ type: String, maxlength: 100 }],
    experienceEmphasized: [{ type: String, maxlength: 200 }],
    projectEmphasized: [{ type: String, maxlength: 200 }],
    fileId: { type: Schema.Types.ObjectId, ref: "File", default: null },
    notes: { type: String, default: "", maxlength: 5000 },
    isActive: { type: Boolean, default: true },
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

ResumeVersionSchema.index({ userId: 1, createdAt: -1 });
ResumeVersionSchema.index({ userId: 1, isActive: 1 });

const ResumeVersion: Model<IResumeVersion> =
  mongoose.models.ResumeVersion ||
  mongoose.model<IResumeVersion>("ResumeVersion", ResumeVersionSchema);

export default ResumeVersion;
