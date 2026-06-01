import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Application from "@/models/Application";
import { requireAuth } from "@/lib/auth/session";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import { escapeRegex } from "@/lib/utils/escape-regex";
import { successResponse, handleApiError } from "@/lib/api/response";

/**
 * POST /api/applications/check-duplicate
 * Checks if there's an existing application with the same jobUrl, 
 * or if no jobUrl is provided, checks if there is one with the same jobTitle and jobDescription.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`check-duplicate:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    const body = await request.json();
    const jobUrl = typeof body.jobUrl === "string" ? body.jobUrl.trim() : "";
    const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim() : "";
    const jobDescription = typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";

    let duplicate = null;

    if (jobUrl) {
      // 1. Try to find by URL (case-insensitive match for the stored URL)
      duplicate = await Application.findOne({
        userId: session.id,
        jobUrl: { $regex: new RegExp("^" + escapeRegex(jobUrl) + "$", "i") },
      })
        .populate("companyId", "name")
        .lean();
    }

    // 2. If no duplicate found by URL (or no URL was provided)
    if (!duplicate && jobTitle) {
      duplicate = await Application.findOne({
        userId: session.id,
        jobTitle: { $regex: new RegExp("^" + escapeRegex(jobTitle) + "$", "i") },
        jobDescription: { $regex: new RegExp("^" + escapeRegex(jobDescription) + "$", "i") },
      })
        .populate("companyId", "name")
        .lean();
    }

    if (duplicate) {
      return successResponse({
        duplicate: true,
        application: {
          id: (duplicate as any)._id?.toString() || (duplicate as any).id,
          jobTitle: (duplicate as any).jobTitle,
          companyName: (duplicate as any).companyId?.name || "Unknown Company",
        },
      });
    }

    return successResponse({
      duplicate: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
