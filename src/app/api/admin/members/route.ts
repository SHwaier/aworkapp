import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import { requireAdmin } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { createMemberSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/api/app-error";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * GET /api/admin/members
 * List all members who can sign in. Admin only.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAdmin();

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`admin-members:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const users = await User.find({}).sort({ createdAt: -1 }).lean();

    const members = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role ?? "user",
      hasGoogle: !!u.googleId,
      mustChangePassword: !!u.mustChangePassword,
      disabled: !!u.disabledAt,
      createdAt: u.createdAt,
    }));

    return successResponse({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/members
 * Create a new member account with a temporary password. Admin only.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAdmin();

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`admin-create-member:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const body = await request.json();
    const validated = createMemberSchema.parse(body);

    await dbConnect();

    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      throw new AppError("A member with this email already exists", 409);
    }

    const passwordHash = await hashPassword(validated.password);

    const user = await User.create({
      name: validated.name,
      email: validated.email,
      passwordHash,
      role: validated.role,
      mustChangePassword: true,
    });

    await createAuditLog({
      userId: session.id,
      action: "admin.member_created",
      entityType: "user",
      entityId: user._id.toString(),
      metadata: { email: user.email, role: user.role },
      request,
    });

    return successResponse(
      {
        member: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          hasGoogle: false,
          mustChangePassword: true,
          disabled: false,
          createdAt: user.createdAt,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
