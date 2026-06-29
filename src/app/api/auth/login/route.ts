import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import { verifyPassword } from "@/lib/auth/password";
import { setAuthCookies, hashToken } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/api/app-error";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { checkBruteForce, recordLoginAttempt } from "@/lib/security/brute-force";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Rate limit: auth (5/minute) — in-memory, best-effort
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`login:${ip}`, RATE_LIMITS.auth);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.auth) }
      );
    }

    // Parse and validate input
    const body = await request.json();
    const validated = loginSchema.parse(body);

    // Connect to database
    await dbConnect();

    // Brute-force protection: check IP and email lockout (MongoDB-backed, persistent)
    const bruteForce = await checkBruteForce(validated.email, ip);
    if (bruteForce.blocked) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed attempts. Please try again in ${bruteForce.retryAfterMinutes} minutes.`,
        },
        { status: 429 }
      );
    }

    const userAgent = request.headers.get("user-agent") || "";

    // Find user — explicitly select passwordHash (excluded by default)
    const user = await User.findOne({ email: validated.email }).select("+passwordHash");

    if (!user) {
      // Record failed attempt for brute-force tracking
      await recordLoginAttempt(validated.email, ip, false, userAgent);
      // Use same error message whether email or password is wrong (prevents user enumeration)
      throw new AppError("Invalid credentials", 401);
    }

    // Verify password
    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      // Record failed attempt for brute-force tracking
      await recordLoginAttempt(validated.email, ip, false, userAgent);
      throw new AppError("Invalid credentials", 401);
    }

    // Record successful login
    await recordLoginAttempt(validated.email, ip, true, userAgent);

    const sessionUser = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    // Set auth cookies — returns raw refresh token for DB storage
    const refreshToken = await setAuthCookies(sessionUser);

    // Store refresh token hash in DB for rotation tracking
    const family = uuidv4();
    await RefreshToken.create({
      tokenHash: hashToken(refreshToken),
      userId: user._id,
      family,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Audit log
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
