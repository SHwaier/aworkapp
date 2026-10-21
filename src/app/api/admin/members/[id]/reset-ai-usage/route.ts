import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import { requireAdmin } from "@/lib/auth/guard";
import { resetAiUsage } from "@/lib/ai/quota";
import { mongoIdSchema } from "@/lib/validators/schemas";
import { errorResponse, handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/members/:id/reset-ai-usage
 * Clear a member's AI usage for today so they get their full daily limit back. Admin only.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    mongoIdSchema.parse(id);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`admin-reset-ai:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();
    const user = await User.findById(id).select("email").lean();
    if (!user) {
      return errorResponse("Not found", 404);
    }

    await resetAiUsage(id);

    await createAuditLog({
      userId: session.id,
      action: "admin.member_ai_usage_reset",
      entityType: "user",
      entityId: id,
      metadata: { email: user.email },
      request,
    });

    return successResponse({ member: { id, aiUsedToday: 0 } });
  } catch (error) {
    return handleApiError(error);
  }
}
