import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import RefreshToken from "@/models/RefreshToken";
import { clearAuthCookies, getSession, hashToken } from "@/lib/auth/session";
import { createAuditLog } from "@/models/AuditLog";
import { successResponse, handleApiError } from "@/lib/api/response";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

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
      await dbConnect();

      // Revoke the current refresh token and its entire family
      const cookieStore = await cookies();
      const rawRefreshToken = cookieStore.get("aos_refresh_token")?.value;

      if (rawRefreshToken) {
        const tokenHash = hashToken(rawRefreshToken);
        const storedToken = await RefreshToken.findOne({ tokenHash });
        if (storedToken) {
          // Revoke entire family — invalidates all rotated tokens
          await RefreshToken.updateMany(
            { family: storedToken.family },
            { $set: { isRevoked: true } }
          );
        }
      }

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
