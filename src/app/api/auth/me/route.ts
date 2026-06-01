import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse } from "@/lib/api/response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

/**
 * GET /api/auth/me
 * Returns the current authenticated user, or 401.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await getSession();

  if (!session) {
    return errorResponse("Not authenticated", 401);
  }

  // Rate limit check
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`auth-me:${session.id || ip}`, RATE_LIMITS.api);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
    );
  }

  return successResponse({ user: session });
}
