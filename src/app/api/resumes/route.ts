import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import ResumeVersion from "@/models/ResumeVersion";
import { requireAuth } from "@/lib/auth/session";
import {
  createResumeVersionSchema,
  paginationSchema,
} from "@/lib/validators/schemas";
import { successResponse, handleApiError } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";

/**
 * GET /api/resumes
 * List resume versions for the authenticated user.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    await dbConnect();

    const url = new URL(request.url);
    const params = paginationSchema.parse({
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      sortBy: url.searchParams.get("sortBy"),
      sortOrder: url.searchParams.get("sortOrder"),
    });

    const query: Record<string, unknown> = { userId: session.id };

    const activeOnly = url.searchParams.get("active");
    if (activeOnly === "true") {
      query.isActive = true;
    }

    const search = url.searchParams.get("search");
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { targetRole: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (params.page - 1) * params.limit;
    const sortDirection = params.sortOrder === "asc" ? 1 : -1;

    const [resumes, total] = await Promise.all([
      ResumeVersion.find(query)
        .sort({ [params.sortBy]: sortDirection })
        .skip(skip)
        .limit(params.limit)
        .lean(),
      ResumeVersion.countDocuments(query),
    ]);

    return successResponse({
      resumes,
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
 * POST /api/resumes
 * Create a new resume version.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    await dbConnect();

    const body = await request.json();
    const validated = createResumeVersionSchema.parse(body);

    // Auto-calculate version number if not provided
    if (!validated.versionNumber) {
      const lastVersion = await ResumeVersion.findOne({ userId: session.id })
        .sort({ versionNumber: -1 })
        .select("versionNumber")
        .lean();
      validated.versionNumber = (lastVersion?.versionNumber || 0) + 1;
    }

    const resume = await ResumeVersion.create({
      ...validated,
      userId: session.id,
    });

    await createAuditLog({
      userId: session.id,
      action: "resume.created",
      entityType: "resume",
      entityId: resume._id.toString(),
      metadata: { name: validated.name, version: validated.versionNumber },
      request,
    });

    return successResponse({ resume }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
