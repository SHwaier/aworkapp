import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Company from "@/models/Company";
import { requireAuth } from "@/lib/auth/session";
import {
  createCompanySchema,
  paginationSchema,
} from "@/lib/validators/schemas";
import {
  successResponse,
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
 * GET /api/companies
 * List companies for the authenticated user.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`api-companies:${session.id || ip}`, RATE_LIMITS.api);
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

    const search = url.searchParams.get("search") || "";

    // Build query — always scoped by userId
    const query: Record<string, unknown> = { userId: session.id };
    if (search) {
      query.name = { $regex: escapeRegex(search), $options: "i" };
    }

    const skip = (params.page - 1) * params.limit;
    const sortDirection = params.sortOrder === "asc" ? 1 : -1;

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ [params.sortBy]: sortDirection })
        .skip(skip)
        .limit(params.limit)
        .lean(),
      Company.countDocuments(query),
    ]);

    return successResponse({
      companies,
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
 * POST /api/companies
 * Create a new company.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`create-company:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    const body = await request.json();
    const validated = createCompanySchema.parse(body);

    const company = await Company.create({
      ...validated,
      userId: session.id,
    });

    await createAuditLog({
      userId: session.id,
      action: "company.created",
      entityType: "company",
      entityId: company._id.toString(),
      request,
    });

    return successResponse({ company }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
