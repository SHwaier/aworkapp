import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Application from "@/models/Application";
import Company from "@/models/Company";
import TimelineEvent from "@/models/TimelineEvent";
import { requireAuth } from "@/lib/auth/session";
import {
  createApplicationSchema,
  paginationSchema,
} from "@/lib/validators/schemas";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { escapeRegex } from "@/lib/utils/escape-regex";

import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

/**
 * GET /api/applications
 * List applications for the authenticated user with filtering.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`api-applications:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    const url = new URL(request.url);
    const params = paginationSchema.parse({
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      sortBy: url.searchParams.get("sortBy"),
      sortOrder: url.searchParams.get("sortOrder"),
    });

    // Build query — always scoped by userId
    const query: Record<string, unknown> = { userId: session.id };

// Filters
    const status = url.searchParams.get("status");
    const lifecycleStage = url.searchParams.get("lifecycleStage");
    const companyId = url.searchParams.get("companyId");
    const source = url.searchParams.get("source");
    const workMode = url.searchParams.get("workMode");
    const search = url.searchParams.get("search");

    if (status) query.currentStatus = status;
    if (lifecycleStage) query.lifecycleStage = lifecycleStage;
    if (companyId) query.companyId = companyId;
    if (source) query.source = source;
    if (workMode) query.workMode = workMode;
    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { jobTitle: { $regex: escaped, $options: "i" } },
        { jobDescription: { $regex: escaped, $options: "i" } },
        { tags: { $in: [new RegExp(escaped, "i")] } },
      ];
    }

    const skip = (params.page - 1) * params.limit;
    const sortDirection = params.sortOrder === "asc" ? 1 : -1;

    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate("companyId", "name industry location")
        .sort({ [params.sortBy]: sortDirection })
        .skip(skip)
        .limit(params.limit)
        .lean(),
      Application.countDocuments(query),
    ]);

    return successResponse({
      applications,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/applications
 * Create a new application with an initial timeline event.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`create-application:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    const body = await request.json();
    const validated = createApplicationSchema.parse(body);

    // Security: Verify the company belongs to this user
    const company = await Company.findOne({
      _id: validated.companyId,
      userId: session.id,
    });
    if (!company) {
      return errorResponse("Company not found", 404);
    }

    const application = await Application.create({
      ...validated,
      userId: session.id,
      appliedAt:
        validated.currentStatus === "Applied"
          ? validated.appliedAt || new Date()
          : validated.appliedAt,
    });

    // Create initial timeline event
    await TimelineEvent.create({
      userId: session.id,
      applicationId: application._id,
      type: "application_submitted",
      title: `Application ${validated.currentStatus === "Applied" ? "submitted" : "created"}`,
      description: `${validated.jobTitle} at ${company.name}`,
      statusAfterEvent: validated.currentStatus,
      lifecycleStageAfterEvent: validated.lifecycleStage,
      eventDate: validated.appliedAt || new Date(),
      source: "system",
    });

    await createAuditLog({
      userId: session.id,
      action: "application.created",
      entityType: "application",
      entityId: application._id.toString(),
      metadata: { companyId: validated.companyId, jobTitle: validated.jobTitle },
      request,
    });

    return successResponse({ application }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
