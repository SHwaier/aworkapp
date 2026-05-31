import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { setAuthCookies } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/api/app-error";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Rate limit: strict (3/minute)
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(
      `register:${ip}`,
      RATE_LIMITS.strict
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.strict) }
      );
    }

    // Parse and validate input
    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Connect to database
    await dbConnect();

    // Check if email already exists
    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      throw new AppError("Email already registered", 409);
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Create user
    const user = await User.create({
      name: validated.name,
      email: validated.email,
      passwordHash,
    });

    // Set auth cookies
    await setAuthCookies({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    // Audit log
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
