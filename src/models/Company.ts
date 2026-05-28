import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  website: string;
  careersUrl: string;
  linkedinUrl: string;
  industry: string;
  location: string;
  notes: string;
  rating: number;
  tags: string[];
  doNotApplyAgain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
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
    website: { type: String, default: "", maxlength: 2000 },
    careersUrl: { type: String, default: "", maxlength: 2000 },
    linkedinUrl: { type: String, default: "", maxlength: 2000 },
    industry: { type: String, default: "", maxlength: 100 },
    location: { type: String, default: "", maxlength: 200 },
    notes: { type: String, default: "", maxlength: 5000 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    tags: [{ type: String, maxlength: 50 }],
    doNotApplyAgain: { type: Boolean, default: false },
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

// Indexes per PRD recommendations
CompanySchema.index({ userId: 1, name: 1 });
CompanySchema.index({ userId: 1, createdAt: -1 });

const Company: Model<ICompany> =
  mongoose.models.Company ||
  mongoose.model<ICompany>("Company", CompanySchema);

export default Company;
