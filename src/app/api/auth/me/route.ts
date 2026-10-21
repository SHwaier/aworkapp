import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { successResponse, handleApiError } from "@/lib/api/response";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * GET /api/auth/me
 * Returns the current authenticated user (including role), or 401.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Validated against the DB: removed, disabled, or reset accounts get a 401
    const user = await requireSession();

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`auth-me:${user.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
