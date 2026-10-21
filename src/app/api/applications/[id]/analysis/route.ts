import { NextResponse, after } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import { requireAuth } from "@/lib/auth/guard";
import { mongoIdSchema } from "@/lib/validators/schemas";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { getAnalysisOverview, runAnalysis, startAnalysis } from "@/lib/services/resume-analysis";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/applications/:id/analysis
 * Latest resume analysis, score history, whether a (re)run is possible, and AI quota.
 */
export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`analysis-get:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();
    return successResponse(await getAnalysisOverview(id, session.id));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/applications/:id/analysis
 * Start an analysis. Returns an existing result when nothing changed (not charged),
 * otherwise queues a run (charged to the daily AI limit) that completes in the background.
 */
export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`analysis-post:${session.id || ip}`, RATE_LIMITS.upload);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.upload) }
      );
    }

    await dbConnect();
    const { analysis, started, ctx } = await startAnalysis(id, session.id);

    if (started) {
      // Runs after the response is sent; the client polls GET for the result
      after(() => runAnalysis(analysis._id, ctx));

      await createAuditLog({
        userId: session.id,
        action: "analysis.requested",
        entityType: "resume_analysis",
        entityId: analysis._id.toString(),
        metadata: { applicationId: id, resumeVersionId: ctx.resumeVersionId.toString() },
        request,
      });
    }

    return successResponse({ analysis, started }, started ? 202 : 200);
  } catch (error) {
    return handleApiError(error);
  }
}
