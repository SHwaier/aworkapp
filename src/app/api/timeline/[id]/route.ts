import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import TimelineEvent from "@/models/TimelineEvent";
import { requireAuth } from "@/lib/auth/session";
import { mongoIdSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/timeline/:id
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

    // Secure scoping
    const event = await TimelineEvent.findOneAndDelete({
      _id: id,
      userId: session.id,
    });

    if (!event) {
      return errorResponse("Not found", 404);
    }

    await createAuditLog({
      userId: session.id,
      action: "timeline.deleted",
      entityType: "timeline",
      entityId: id,
      request,
    });

    return successResponse({ message: "Timeline event deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
