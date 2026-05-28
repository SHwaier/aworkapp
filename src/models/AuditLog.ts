import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "user.login",
        "user.register",
        "user.logout",
        "user.settings_changed",
        "application.created",
        "application.updated",
        "application.deleted",
        "application.status_changed",
        "company.created",
        "company.updated",
        "company.deleted",
        "resume.created",
        "resume.updated",
        "resume.deleted",
        "resume_snapshot.created",
        "file.uploaded",
        "file.downloaded",
        "file.deleted",
        "note.created",
        "note.updated",
        "note.deleted",
        "timeline.created",
        "timeline.updated",
        "timeline.deleted",
        "job.imported",
      ],
    },
    entityType: { type: String, required: true },
    entityId: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "", maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, action: 1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;

/**
 * Helper to create an audit log entry.
 * Call this from API routes after sensitive operations.
 */
export async function createAuditLog(params: {
  userId: string;
  action: IAuditLog["action"];
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  try {
    await AuditLog.create({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || "",
      metadata: params.metadata || {},
      ipAddress: params.request?.headers.get("x-forwarded-for") || "",
      userAgent: params.request?.headers.get("user-agent")?.slice(0, 500) || "",
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("Failed to create audit log:", error);
  }
}
