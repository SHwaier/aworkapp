import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Company from "@/models/Company";
import { requireAuth } from "@/lib/auth/session";
import {
  createCompanySchema,
  paginationSchema,
} from "@/lib/validators/schemas";
import {
  successResponse,
  handleApiError,
} from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";

/**
 * GET /api/companies
 * List companies for the authenticated user.
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

    const search = url.searchParams.get("search") || "";

    // Build query — always scoped by userId
    const query: Record<string, unknown> = { userId: session.id };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const skip = (params.page - 1) * params.limit;
    const sortDirection = params.sortOrder === "asc" ? 1 : -1;

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ [params.sortBy]: sortDirection })
        .skip(skip)
        .limit(params.limit)
        .lean(),
      Company.countDocuments(query),
    ]);

    return successResponse({
      companies,
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
 * POST /api/companies
 * Create a new company.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    await dbConnect();

    const body = await request.json();
    const validated = createCompanySchema.parse(body);

    const company = await Company.create({
      ...validated,
      userId: session.id,
    });

    await createAuditLog({
      userId: session.id,
      action: "company.created",
      entityType: "company",
      entityId: company._id.toString(),
      request,
    });

    return successResponse({ company }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
