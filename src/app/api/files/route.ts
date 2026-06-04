import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import File from "@/models/File";
import { requireAuth } from "@/lib/auth/session";
import { paginationSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { escapeRegex } from "@/lib/utils/escape-regex";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";
import { uploadFile } from "@/lib/services/file";

/**
 * GET /api/files
 * List uploaded files for user.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`api-files:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    const url = new URL(request.url);
    const params = paginationSchema.parse({
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      sortBy: url.searchParams.get("sortBy"),
      sortOrder: url.searchParams.get("sortOrder"),
    });

    const category = url.searchParams.get("category");
    const query: Record<string, unknown> = { userId: session.id };
    if (category && category !== "all") {
      query.category = category;
    }

    const search = url.searchParams.get("search");
    if (search) {
      query.displayName = { $regex: escapeRegex(search), $options: "i" };
    }

    const skip = (params.page - 1) * params.limit;
    const sortDirection = params.sortOrder === "asc" ? 1 : -1;

    const [files, total] = await Promise.all([
      File.find(query)
        .sort({ [params.sortBy]: sortDirection })
        .skip(skip)
        .limit(params.limit)
        .lean(),
      File.countDocuments(query),
    ]);

    return successResponse({
      files,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/files
 * Upload a file using modular file service helper.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate limit check for file uploads
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`upload-files:${session.id || ip}`, RATE_LIMITS.upload);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many upload attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.upload) }
      );
    }

    await dbConnect();

    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const category = formData.get("category") as string || "other";

    if (!file || !(file instanceof Blob)) {
      return errorResponse("No file uploaded", 400);
    }

    const originalFileName = (file as any).name || "file";

    const { file: fileDoc, duplicate } = await uploadFile({
      file,
      originalFileName,
      userId: session.id,
      category,
      request,
    });

    return successResponse({ file: fileDoc, duplicate }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
