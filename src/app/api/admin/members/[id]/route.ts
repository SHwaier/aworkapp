import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import { requireAdmin } from "@/lib/auth/guard";
import { deleteUserAndData } from "@/lib/services/user-data";
import { deleteMemberSchema, mongoIdSchema, updateMemberSchema } from "@/lib/validators/schemas";
import { errorResponse, handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/api/app-error";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/members/:id
 * Change a member's role and/or disable or re-enable their account. Admin only.
 * Disabling ends the member's sessions immediately. Admins cannot change themselves.
 */
export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    mongoIdSchema.parse(id);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`admin-update-member:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    if (id === session.id) {
      throw new AppError("You cannot change your own account here", 400);
    }

    const body = await request.json();
    const validated = updateMemberSchema.parse(body);

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return errorResponse("Not found", 404);
    }

    if (validated.role !== undefined && validated.role !== user.role) {
      const previousRole = user.role;
      user.role = validated.role;
      await user.save();

      await createAuditLog({
        userId: session.id,
        action: "admin.member_role_changed",
        entityType: "user",
        entityId: id,
        metadata: { email: user.email, from: previousRole, to: user.role },
        request,
      });
    }

    if (validated.disabled !== undefined && validated.disabled !== !!user.disabledAt) {
      if (validated.disabled) {
        user.disabledAt = new Date();
        // End every existing session right away
        user.sessionVersion = (user.sessionVersion ?? 0) + 1;
        await user.save();
        await RefreshToken.updateMany({ userId: id }, { $set: { isRevoked: true } });
      } else {
        user.disabledAt = null;
        await user.save();
      }

      await createAuditLog({
        userId: session.id,
        action: validated.disabled ? "admin.member_disabled" : "admin.member_enabled",
        entityType: "user",
        entityId: id,
        metadata: { email: user.email },
        request,
      });
    }

    return successResponse({
      member: { id, role: user.role, disabled: !!user.disabledAt },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/members/:id
 * Permanently delete a member and all of their data, including stored files.
 * Requires { confirmEmail } matching the member's email. Admin only; admins
 * cannot delete themselves.
 */
export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    mongoIdSchema.parse(id);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`admin-delete-member:${session.id || ip}`, RATE_LIMITS.strict);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.strict) }
      );
    }

    if (id === session.id) {
      throw new AppError("You cannot delete your own account", 400);
    }

    const body = await request.json();
    const { confirmEmail } = deleteMemberSchema.parse(body);

    await dbConnect();

    const user = await User.findById(id).select("email").lean();
    if (!user) {
      return errorResponse("Not found", 404);
    }

    if (confirmEmail !== user.email) {
      throw new AppError("Confirmation email does not match", 400);
    }

    const { filesDeleted } = await deleteUserAndData(user);

    await createAuditLog({
      userId: session.id,
      action: "admin.member_deleted",
      entityType: "user",
      entityId: id,
      metadata: { email: user.email, filesDeleted },
      request,
    });

    return successResponse({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
