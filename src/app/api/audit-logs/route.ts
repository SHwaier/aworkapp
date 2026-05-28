import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import AuditLog from "@/models/AuditLog";
import { requireAuth } from "@/lib/auth/session";
import { paginationSchema } from "@/lib/validators/schemas";
import { successResponse, handleApiError } from "@/lib/api/response";

/**
 * GET /api/audit-logs
 * Securely fetch audit logs for the current user.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    await dbConnect();

    const url = new URL(request.url);
    const params = paginationSchema.parse({
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    const skip = (params.page - 1) * params.limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({ userId: session.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .lean(),
      AuditLog.countDocuments({ userId: session.id }),
    ]);

    return successResponse({
      logs,
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
