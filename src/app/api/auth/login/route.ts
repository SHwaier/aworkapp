import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";
import { setAuthCookies } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/api/app-error";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { checkLoginBan, recordLoginFailure, recordLoginSuccess } from "@/lib/services/security";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);

    // 1. General Rate limit: auth (5/minute)
    const rateLimit = checkRateLimit(`login:${ip}`, RATE_LIMITS.auth);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.auth) }
      );
    }

    // 2. Parse request body
    const body = await request.json();

    // 3. Honeypot protection
    if (body.username_confirm) {
      console.warn(`[SECURITY] Honeypot triggered on login by IP: ${ip}`);
      return NextResponse.json(
        { success: false, error: "Invalid request parameters." },
        { status: 400 }
      );
    }

    // 4. Validate input schema
    const validated = loginSchema.parse(body);

    // 5. Connect to database
    await dbConnect();

    // 6. Check if IP or email is currently banned (Fail2ban equivalent)
    await checkLoginBan(ip, validated.email);

    // 7. Find user
    const user = await User.findOne({ email: validated.email }).select("+passwordHash");

    if (!user) {
      // Record failure for both IP and email
      await recordLoginFailure(ip, validated.email, request);
      throw new AppError("Invalid credentials", 401);
    }

    // 8. Verify password
    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      // Record failure for both IP and email
      await recordLoginFailure(ip, validated.email, request);
      throw new AppError("Invalid credentials", 401);
    }

    // 9. Reset security ban tracking on successful authentication
    await recordLoginSuccess(ip, validated.email);

    // 10. Set auth cookies
    await setAuthCookies({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    // 11. Audit log
    await createAuditLog({
      userId: user._id.toString(),
      action: "user.login",
      entityType: "user",
      entityId: user._id.toString(),
      request,
    });

    return successResponse({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
