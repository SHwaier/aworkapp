import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/guard";
import { mongoIdSchema, updateSuggestionSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { updateSuggestionStatus } from "@/lib/services/resume-analysis";

interface RouteParams {
  params: Promise<{ id: string; suggestionId: string }>;
}

/**
 * PATCH /api/applications/:id/analysis/suggestions/:suggestionId
 * Mark a suggestion open, done, or dismissed. Doesn't affect the score.
 */
export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id, suggestionId } = await params;
    mongoIdSchema.parse(id);
    mongoIdSchema.parse(suggestionId);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`suggestion-patch:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const { status } = updateSuggestionSchema.parse(await request.json());

    await dbConnect();
    await updateSuggestionStatus(id, session.id, suggestionId, status);

    await createAuditLog({
      userId: session.id,
      action: "analysis.suggestion_updated",
      entityType: "resume_analysis",
      entityId: suggestionId,
      metadata: { applicationId: id, status },
      request,
    });

    return successResponse({ id: suggestionId, status });
  } catch (error) {
    return handleApiError(error);
  }
}
