import mongoose, { Schema, type Document, type Model } from "mongoose";

/**
 * A resume and its version history. Each version is a File with
 * `resumeId` set to this resume and its own `versionNumber`; uploading on top
 * adds the next version and older ones are kept for restoring.
 */
export interface IResume extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  targetRole: string;
  targetIndustry: string;
  skillsEmphasized: string[];
  notes: string;
  /** Archived resumes are hidden from pickers but keep their history */
  isActive: boolean;
  /** The version new assignments use */
  currentFileId: mongoose.Types.ObjectId;
  /** Highest version number handed out so far; the next upload gets this + 1 */
  latestVersionNumber: number;
  /** Set when this resume was created by tailoring another one */
  basedOn: { resumeId: mongoose.Types.ObjectId; versionNumber: number } | null;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    targetRole: { type: String, default: "", maxlength: 200 },
    targetIndustry: { type: String, default: "", maxlength: 200 },
    skillsEmphasized: [{ type: String, maxlength: 100 }],
    notes: { type: String, default: "", maxlength: 5000 },
    isActive: { type: Boolean, default: true },
    currentFileId: { type: Schema.Types.ObjectId, ref: "File", required: true },
    latestVersionNumber: { type: Number, default: 1, min: 1 },
    basedOn: {
      type: new Schema(
        {
          resumeId: { type: Schema.Types.ObjectId, ref: "Resume" },
          versionNumber: Number,
        },
        { _id: false }
      ),
      default: null,
    },
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

ResumeSchema.index({ userId: 1, updatedAt: -1 });

const Resume: Model<IResume> =
  mongoose.models.Resume || mongoose.model<IResume>("Resume", ResumeSchema);

export default Resume;
