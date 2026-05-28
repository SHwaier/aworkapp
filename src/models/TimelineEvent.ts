import mongoose, { Schema, type Document, type Model } from "mongoose";
import { TIMELINE_EVENT_TYPES } from "@/lib/validators/schemas";

export interface ITimelineEvent extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  description: string;
  statusAfterEvent: string;
  lifecycleStageAfterEvent: string;
  eventDate: Date;
  relatedContactId: mongoose.Types.ObjectId | null;
  relatedFileIds: mongoose.Types.ObjectId[];
  reminderAt: Date | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimelineEventSchema = new Schema<ITimelineEvent>(
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
      enum: TIMELINE_EVENT_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    description: { type: String, default: "", maxlength: 5000 },
    statusAfterEvent: { type: String, default: "" },
    lifecycleStageAfterEvent: { type: String, default: "" },
    eventDate: { type: Date, required: true },
    relatedContactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },
    relatedFileIds: [{ type: Schema.Types.ObjectId, ref: "File" }],
    reminderAt: { type: Date, default: null },
    source: {
      type: String,
      enum: ["manual", "email-import", "calendar-import", "system", "ai"],
      default: "manual",
    },
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

// Index per PRD
TimelineEventSchema.index({
  userId: 1,
  applicationId: 1,
  eventDate: -1,
});

const TimelineEvent: Model<ITimelineEvent> =
  mongoose.models.TimelineEvent ||
  mongoose.model<ITimelineEvent>("TimelineEvent", TimelineEventSchema);

export default TimelineEvent;
