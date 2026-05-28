import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Note from "@/models/Note";
import Application from "@/models/Application";
import { requireAuth } from "@/lib/auth/session";
import { createNoteSchema, mongoIdSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/applications/:id/notes
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    await dbConnect();

    const app = await Application.findOne({ _id: id, userId: session.id });
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    const notes = await Note.find({
      userId: session.id,
      applicationId: id,
    })
      .sort({ pinned: -1, createdAt: -1 })
      .lean();

    return successResponse({ notes });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/applications/:id/notes
 */
export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    await dbConnect();

    const body = await request.json();
    const validated = createNoteSchema.parse({
      ...body,
      applicationId: id,
    });

    const app = await Application.findOne({ _id: id, userId: session.id });
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    const note = await Note.create({
      ...validated,
      userId: session.id,
    });

    await createAuditLog({
      userId: session.id,
      action: "note.created",
      entityType: "note",
      entityId: note._id.toString(),
      metadata: { applicationId: id, type: validated.type },
      request,
    });

    return successResponse({ note }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
