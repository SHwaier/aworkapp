import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import ResumeChecklist from "@/models/ResumeChecklist";
import { createAuditLog } from "@/models/AuditLog";
import { requireAuth } from "@/lib/auth/session";
import { mongoIdSchema, updateChecklistItemSchema } from "@/lib/validators/schemas";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api/response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import { computeScore } from "@/lib/services/checklist";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * PATCH /api/applications/:id/resume/checklist/:itemId
 * Update a single checklist item's status.
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id: applicationId, itemId } = await params;
    mongoIdSchema.parse(applicationId);
    mongoIdSchema.parse(itemId);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(
      `checklist-patch:${session.id || ip}`,
      RATE_LIMITS.api
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const body = await request.json();
    const parsed = updateChecklistItemSchema.parse(body);

    await dbConnect();

    const checklist = await ResumeChecklist.findOne({
      applicationId,
      userId: session.id,
    });

    if (!checklist) {
      return errorResponse("Checklist not found", 404);
    }

    // Find the item subdocument
    const item = checklist.items.find(
      (i) => i._id.toString() === itemId
    );
    if (!item) {
      return errorResponse("Checklist item not found", 404);
    }

    item.status = parsed.status;

    // Recompute score
    checklist.overallScore = computeScore(
      checklist.items.map((i) => ({ status: i.status }))
    );

    await checklist.save();

    await createAuditLog({
      userId: session.id,
      action: "checklist.item_updated",
      entityType: "checklist",
      entityId: checklist._id.toString(),
      metadata: { applicationId, itemId, status: parsed.status, itemTitle: item.title },
      request,
    });

    return successResponse({ checklist });
  } catch (error) {
    return handleApiError(error);
  }
}
