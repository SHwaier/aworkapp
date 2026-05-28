import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import Company from "@/models/Company";
import Application from "@/models/Application";
import { requireAuth } from "@/lib/auth/session";
import {
  updateCompanySchema,
  mongoIdSchema,
} from "@/lib/validators/schemas";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/companies/:id
 * Get a single company with its applications.
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    await dbConnect();

    // Security: scoped by userId — prevents IDOR
    const company = await Company.findOne({
      _id: id,
      userId: session.id,
    }).lean();

    if (!company) {
      return errorResponse("Not found", 404);
    }

    // Fetch related applications
    const applications = await Application.find({
      userId: session.id,
      companyId: id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse({ company, applications });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/companies/:id
 * Update a company.
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    const body = await request.json();
    const validated = updateCompanySchema.parse(body);

    await dbConnect();

    // Security: scoped by userId
    const company = await Company.findOneAndUpdate(
      { _id: id, userId: session.id },
      { $set: validated },
      { new: true, runValidators: true }
    );

    if (!company) {
      return errorResponse("Not found", 404);
    }

    await createAuditLog({
      userId: session.id,
      action: "company.updated",
      entityType: "company",
      entityId: id,
      metadata: { fields: Object.keys(validated) },
      request,
    });

    return successResponse({ company });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/companies/:id
 * Delete a company (only if no applications reference it).
 */
export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    await dbConnect();

    // Check for existing applications
    const applicationCount = await Application.countDocuments({
      userId: session.id,
      companyId: id,
    });

    if (applicationCount > 0) {
      return errorResponse(
        `Cannot delete company with ${applicationCount} application(s). Remove applications first.`,
        400
      );
    }

    const company = await Company.findOneAndDelete({
      _id: id,
      userId: session.id,
    });

    if (!company) {
      return errorResponse("Not found", 404);
    }

    await createAuditLog({
      userId: session.id,
      action: "company.deleted",
      entityType: "company",
      entityId: id,
      request,
    });

    return successResponse({ message: "Company deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
