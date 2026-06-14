import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { setAuthCookies } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/api/app-error";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import {
  checkLoginBan,
  isDisposableEmail,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/services/security";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);

    // 1. General Rate limit: strict (3/minute)
    const rateLimit = checkRateLimit(`register:${ip}`, RATE_LIMITS.strict);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.strict) }
      );
    }

    // 2. Parse request body
    const body = await request.json();

    // 3. Honeypot protection
    if (body.username_confirm) {
      console.warn(`[SECURITY] Honeypot triggered on registration by IP: ${ip}`);
      return NextResponse.json(
        { success: false, error: "Invalid request parameters." },
        { status: 400 }
      );
    }

    // 4. Validate input schema
    const validated = registerSchema.parse(body);

    // 5. Check for disposable/temporary email provider
    if (isDisposableEmail(validated.email)) {
      throw new AppError(
        "Registration with disposable or temporary email addresses is not permitted.",
        400
      );
    }

    // 6. Connect to database
    await dbConnect();

    // 7. Check if IP or email is banned (Fail2ban equivalent)
    await checkLoginBan(ip, validated.email);

    // 8. Check if email already exists
    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      // Record failed attempt to prevent email enumeration attacks
      await recordLoginFailure(ip, validated.email, request);
      throw new AppError("Email already registered", 409);
    }

    // 9. Hash password
    const passwordHash = await hashPassword(validated.password);

    // 10. Create user
    const user = await User.create({
      name: validated.name,
      email: validated.email,
      passwordHash,
    });

    // 11. Clear security/ban records if they existed for this IP/email
    await recordLoginSuccess(ip, validated.email);

    // 12. Set auth cookies
    await setAuthCookies({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    // 13. Audit log
    await createAuditLog({
      userId: user._id.toString(),
      action: "user.register",
      entityType: "user",
      entityId: user._id.toString(),
      request,
    });

    return successResponse(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
