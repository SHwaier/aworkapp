import { NextResponse } from "next/server";
import { clearAuthCookies, getSession } from "@/lib/auth/session";
import { createAuditLog } from "@/models/AuditLog";
import { successResponse, handleApiError } from "@/lib/api/response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getSession();

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`logout:${session?.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    if (session) {
      await createAuditLog({
        userId: session.id,
        action: "user.logout",
        entityType: "user",
        entityId: session.id,
        request,
      });
    }

    await clearAuthCookies();

    return successResponse({ message: "Logged out successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
