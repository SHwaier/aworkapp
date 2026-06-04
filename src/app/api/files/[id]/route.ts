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
import { deleteFile } from "@/lib/services/file";

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

    const url = new URL(request.url);
    if (url.searchParams.get("metadata") === "true") {
      return successResponse({ file });
    }

    let buffer: any;

    try {
      if (file.storageProvider === "r2" || file.storageProvider === "s3") {
        const { downloadFromS3 } = await import("@/lib/storage/s3");
        buffer = await downloadFromS3(file.storageKey);
      } else {
        const storageDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FILE_STORAGE_PATH || "./uploads");
        const filePath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), storageDir, file.storageKey);
        buffer = await fs.readFile(filePath);
      }

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
      console.error("File storage read error:", err);
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

    // Call service to delete file from storage and database
    const success = await deleteFile(id, session.id);
    if (!success) {
      return errorResponse("Not found", 404);
    }

    await createAuditLog({
      userId: session.id,
      action: "file.deleted",
      entityType: "file",
      entityId: id,
      request,
    });

    return successResponse({ message: "File deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
