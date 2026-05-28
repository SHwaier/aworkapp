import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";
import { setAuthCookies } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Rate limit: auth (5/minute)
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`login:${ip}`, RATE_LIMITS.auth);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // Parse and validate input
    const body = await request.json();
    const validated = loginSchema.parse(body);

    // Connect to database
    await dbConnect();

    // Find user — explicitly select passwordHash (excluded by default)
    const user = await User.findOne({ email: validated.email }).select(
      "+passwordHash"
    );

    if (!user) {
      // Use same error message whether email or password is wrong (prevents user enumeration)
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isValid = await verifyPassword(
      validated.password,
      user.passwordHash
    );
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Set auth cookies
    await setAuthCookies({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
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
