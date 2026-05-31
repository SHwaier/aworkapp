import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import dbConnect from "@/lib/db/mongoose";
import File from "@/models/File";
import { requireAuth } from "@/lib/auth/session";
import { mongoIdSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/files/:id
 * Securely downloads/streams the requested file.
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse | Response> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`download-file:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many download requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    // Query file including storageKey (hidden by default)
    const file = await File.findOne({ _id: id, userId: session.id }).select("+storageKey");
    if (!file) {
      return errorResponse("Not found", 404);
    }

    const storageDir = path.resolve(process.env.FILE_STORAGE_PATH || "./uploads");
    const filePath = path.join(storageDir, file.storageKey);

    try {
      const buffer = await fs.readFile(filePath);

      // Clean header parameters to prevent header injection or encoding issues
      const safeName = encodeURIComponent(file.displayName).replace(/['()]/g, escape);

      // Log download audit event
      await createAuditLog({
        userId: session.id,
        action: "file.downloaded",
        entityType: "file",
        entityId: id,
        request,
      });

      return new Response(buffer, {
        headers: {
          "Content-Type": file.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${safeName}`,
          "Content-Length": file.fileSize.toString(),
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox;",
        },
      });
    } catch (err) {
      console.error("Local file system error:", err);
      return errorResponse("File storage read error", 500);
    }
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/files/:id
 * Deletes file entry from DB and deletes local file from storage path.
 */
export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    mongoIdSchema.parse(id);

    // Rate limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`delete-file:${session.id || ip}`, RATE_LIMITS.api);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many delete attempts. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    await dbConnect();

    // Query with storageKey to delete physical file
    const file = await File.findOne({ _id: id, userId: session.id }).select("+storageKey");
    if (!file) {
      return errorResponse("Not found", 404);
    }

    // Remove DB entry
    await File.deleteOne({ _id: id });

    // Attempt physical deletion
    try {
      const storageDir = path.resolve(process.env.FILE_STORAGE_PATH || "./uploads");
      const filePath = path.join(storageDir, file.storageKey);
      await fs.unlink(filePath);
    } catch (err) {
      // Log error but don't break the response if file was already missing
      console.error("Failed to delete physical file:", err);
    }

    await createAuditLog({
      userId: session.id,
      action: "file.deleted",
      entityType: "file",
      entityId: id,
      metadata: { originalFileName: file.originalFileName },
      request,
    });

    return successResponse({ message: "File deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
