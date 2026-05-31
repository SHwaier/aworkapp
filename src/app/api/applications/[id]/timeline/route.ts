import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import TimelineEvent from "@/models/TimelineEvent";
import Application from "@/models/Application";
import { requireAuth } from "@/lib/auth/session";
import { createTimelineEventSchema, mongoIdSchema } from "@/lib/validators/schemas";
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
 * GET /api/applications/:id/timeline
 * Get timeline events for an application.
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`get-timeline:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    // Verify application belongs to user
    const app = await Application.findOne({ _id: id, userId: session.id });
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    const timeline = await TimelineEvent.find({
      userId: session.id,
      applicationId: id,
    })
      .sort({ eventDate: -1 })
      .lean();

    return successResponse({ timeline });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/applications/:id/timeline
 * Add a timeline event to an application.
 */
export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`create-timeline:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    const body = await request.json();
    const validated = createTimelineEventSchema.parse({
      ...body,
      applicationId: id,
    });

    // Verify application belongs to user
    const app = await Application.findOne({ _id: id, userId: session.id });
    if (!app) {
      return errorResponse("Application not found", 404);
    }

    const event = await TimelineEvent.create({
      ...validated,
      userId: session.id,
    });

    // Update application status if the event changes it
    const updates: Record<string, unknown> = {};
    if (validated.statusAfterEvent) {
      updates.currentStatus = validated.statusAfterEvent;
    }
    if (validated.lifecycleStageAfterEvent) {
      updates.lifecycleStage = validated.lifecycleStageAfterEvent;
    }

    if (Object.keys(updates).length > 0) {
      await Application.findOneAndUpdate(
        { _id: id, userId: session.id },
        { $set: updates }
      );
    }

    await createAuditLog({
      userId: session.id,
      action: "timeline.created",
      entityType: "timeline",
      entityId: event._id.toString(),
      metadata: {
        applicationId: id,
        type: validated.type,
        title: validated.title,
      },
      request,
    });

    return successResponse({ event }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
