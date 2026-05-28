import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Application from "@/models/Application";
import TimelineEvent from "@/models/TimelineEvent";
import Note from "@/models/Note";
import { requireAuth } from "@/lib/auth/session";
import {
  updateApplicationSchema,
  mongoIdSchema,
} from "@/lib/validators/schemas";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/applications/:id
 * Get a single application with its timeline, notes, and related data.
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    await dbConnect();

    // Security: scoped by userId
    const application = await Application.findOne({
      _id: id,
      userId: session.id,
    })
      .populate("companyId")
      .lean();

    if (!application) {
      return errorResponse("Not found", 404);
    }

    // Fetch related data in parallel
    const [timeline, notes] = await Promise.all([
      TimelineEvent.find({
        userId: session.id,
        applicationId: id,
      })
        .sort({ eventDate: -1 })
        .lean(),
      Note.find({
        userId: session.id,
        applicationId: id,
      })
        .sort({ pinned: -1, createdAt: -1 })
        .lean(),
    ]);

    return successResponse({ application, timeline, notes });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/applications/:id
 * Update an application. Tracks status changes via timeline.
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    const body = await request.json();
    const validated = updateApplicationSchema.parse(body);

    await dbConnect();

    // Get current application to detect status changes
    const current = await Application.findOne({
      _id: id,
      userId: session.id,
    });

    if (!current) {
      return errorResponse("Not found", 404);
    }

    // Track status change
    const statusChanged =
      validated.currentStatus &&
      validated.currentStatus !== current.currentStatus;

    // Update application
    const application = await Application.findOneAndUpdate(
      { _id: id, userId: session.id },
      { $set: validated },
      { new: true, runValidators: true }
    ).populate("companyId");

    // Auto-create timeline event on status change
    if (statusChanged && application) {
      await TimelineEvent.create({
        userId: session.id,
        applicationId: id,
        type: "status_change",
        title: `Status changed to ${validated.currentStatus}`,
        description: `Changed from "${current.currentStatus}" to "${validated.currentStatus}"`,
        statusAfterEvent: validated.currentStatus,
        lifecycleStageAfterEvent:
          validated.lifecycleStage || current.lifecycleStage,
        eventDate: new Date(),
        source: "system",
      });

      await createAuditLog({
        userId: session.id,
        action: "application.status_changed",
        entityType: "application",
        entityId: id,
        metadata: {
          from: current.currentStatus,
          to: validated.currentStatus,
        },
        request,
      });
    }

    await createAuditLog({
      userId: session.id,
      action: "application.updated",
      entityType: "application",
      entityId: id,
      metadata: { fields: Object.keys(validated) },
      request,
    });

    return successResponse({ application });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/applications/:id
 * Delete an application and all related data.
 */
export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    await dbConnect();

    const application = await Application.findOneAndDelete({
      _id: id,
      userId: session.id,
    });

    if (!application) {
      return errorResponse("Not found", 404);
    }

    // Cascade delete related data
    await Promise.all([
      TimelineEvent.deleteMany({ userId: session.id, applicationId: id }),
      Note.deleteMany({ userId: session.id, applicationId: id }),
    ]);

    await createAuditLog({
      userId: session.id,
      action: "application.deleted",
      entityType: "application",
      entityId: id,
      metadata: { jobTitle: application.jobTitle },
      request,
    });

    return successResponse({ message: "Application deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
