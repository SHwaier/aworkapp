import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import { requireAdmin } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { mongoIdSchema, resetMemberPasswordSchema } from "@/lib/validators/schemas";
import { errorResponse, handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/api/app-error";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/members/:id/reset-password
 * Set a temporary password for a member and require them to change it on next sign-in.
 * Revokes the member's sessions. Admin only; admins change their own password normally.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    mongoIdSchema.parse(id);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`admin-reset-password:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    if (id === session.id) {
      throw new AppError("Use Settings to change your own password", 400);
    }

    const body = await request.json();
    const validated = resetMemberPasswordSchema.parse(body);

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return errorResponse("Not found", 404);
    }

    user.passwordHash = await hashPassword(validated.password);
    user.mustChangePassword = true;
    // End every existing session right away
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    await user.save();

    // Sign the member out everywhere so the temporary password takes effect
    await RefreshToken.updateMany({ userId: id }, { $set: { isRevoked: true } });

    await createAuditLog({
      userId: session.id,
      action: "admin.member_password_reset",
      entityType: "user",
      entityId: id,
      metadata: { email: user.email },
      request,
    });

    return successResponse({ member: { id, mustChangePassword: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
