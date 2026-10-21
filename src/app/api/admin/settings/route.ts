import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/auth/guard";
import { getAppSettings } from "@/models/AppSettings";
import { updateAiSettingsSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";

function toResponse(settings: { aiDailyLimit: number; aiExemptAdmins: boolean }) {
  return { aiDailyLimit: settings.aiDailyLimit, aiExemptAdmins: settings.aiExemptAdmins };
}

/**
 * GET /api/admin/settings
 * App-wide AI limits. Admin only.
 */
export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
    await dbConnect();
    return successResponse({ settings: toResponse(await getAppSettings()) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/settings
 * Change the default daily AI limit and/or whether admins are exempt. Admin only.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAdmin();

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`admin-settings:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const validated = updateAiSettingsSchema.parse(await request.json());

    await dbConnect();
    const settings = await getAppSettings();
    const before = toResponse(settings);
    if (validated.aiDailyLimit !== undefined) settings.aiDailyLimit = validated.aiDailyLimit;
    if (validated.aiExemptAdmins !== undefined) settings.aiExemptAdmins = validated.aiExemptAdmins;
    await settings.save();

    await createAuditLog({
      userId: session.id,
      action: "admin.ai_settings_changed",
      entityType: "settings",
      entityId: settings._id.toString(),
      metadata: { before, after: toResponse(settings) },
      request,
    });

    return successResponse({ settings: toResponse(settings) });
  } catch (error) {
    return handleApiError(error);
  }
}
