import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import { setAuthCookies, hashToken } from "@/lib/auth/session";
import { requireSession } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/api/app-error";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/auth/change-password
 * Change the signed-in user's password. Clears the "must change password" flag,
 * ends every other session (sessionVersion bump), and issues fresh tokens for this one.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    // requireSession, not requireAuth: temporary-password users must be able to get here
    const session = await requireSession();

    // Rate limit: auth (5/minute) — guards against guessing the current password
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`change-password:${session.id || ip}`, RATE_LIMITS.auth);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.auth) }
      );
    }

    const body = await request.json();
    const validated = changePasswordSchema.parse(body);

    await dbConnect();

    const user = await User.findById(session.id).select("+passwordHash");
    if (!user) {
      throw new AppError("Authentication required", 401);
    }

    const isValid = await verifyPassword(validated.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError("Current password is incorrect", 400);
    }

    user.passwordHash = await hashPassword(validated.newPassword);
    user.mustChangePassword = false;
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    await user.save();

    // Sign out every other session, then start a fresh one for this device
    await RefreshToken.updateMany({ userId: user._id }, { $set: { isRevoked: true } });

    const refreshToken = await setAuthCookies({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      mustChangePassword: false,
      sessionVersion: user.sessionVersion,
    });

    await RefreshToken.create({
      tokenHash: hashToken(refreshToken),
      userId: user._id,
      family: uuidv4(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await createAuditLog({
      userId: user._id.toString(),
      action: "user.password_changed",
      entityType: "user",
      entityId: user._id.toString(),
      request,
    });

    return successResponse({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role ?? "user",
        mustChangePassword: false,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
