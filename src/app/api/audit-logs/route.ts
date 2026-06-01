import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import AuditLog from "@/models/AuditLog";
import { requireAuth } from "@/lib/auth/session";
import { paginationSchema } from "@/lib/validators/schemas";
import { successResponse, handleApiError } from "@/lib/api/response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

/**
 * GET /api/audit-logs
 * Securely fetch audit logs for the current user.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`get-audit-logs:${session.id || ip}`, RATE_LIMITS.api);
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
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    const skip = (params.page - 1) * params.limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({ userId: session.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .lean(),
      AuditLog.countDocuments({ userId: session.id }),
    ]);

    return successResponse({
      logs,
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
