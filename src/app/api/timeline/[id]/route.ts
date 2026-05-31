import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import TimelineEvent from "@/models/TimelineEvent";
import { requireAuth } from "@/lib/auth/session";
import { mongoIdSchema, updateTimelineEventSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";

import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/timeline/:id
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`update-timeline:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const body = await request.json();
    const validated = updateTimelineEventSchema.parse(body);

    await dbConnect();

    // Secure scoping: only own user's events
    const event = await TimelineEvent.findOneAndUpdate(
      { _id: id, userId: session.id },
      { $set: validated },
      { new: true, runValidators: true }
    );

    if (!event) {
      return errorResponse("Not found", 404);
    }

    await createAuditLog({
      userId: session.id,
      action: "timeline.updated",
      entityType: "timeline",
      entityId: id,
      metadata: { fields: Object.keys(validated) },
      request,
    });

    return successResponse({ event });
  } catch (error) {
    return handleApiError(error);
  }
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

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`delete-timeline:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

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
