import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Note from "@/models/Note";
import { requireAuth } from "@/lib/auth/session";
import { updateNoteSchema, mongoIdSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notes/:id
 * Toggle pin state or edit body.
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
    const validated = updateNoteSchema.parse(body);

    await dbConnect();

    // Secure scoping: only update if note belongs to user
    const note = await Note.findOneAndUpdate(
      { _id: id, userId: session.id },
      { $set: validated },
      { new: true, runValidators: true }
    );

    if (!note) {
      return errorResponse("Not found", 404);
    }

    await createAuditLog({
      userId: session.id,
      action: "note.updated",
      entityType: "note",
      entityId: id,
      metadata: { fields: Object.keys(validated) },
      request,
    });

    return successResponse({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/notes/:id
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
    const note = await Note.findOneAndDelete({ _id: id, userId: session.id });

    if (!note) {
      return errorResponse("Not found", 404);
    }

    await createAuditLog({
      userId: session.id,
      action: "note.deleted",
      entityType: "note",
      entityId: id,
      request,
    });

    return successResponse({ message: "Note deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
