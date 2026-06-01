import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import dbConnect from "@/lib/db/mongoose";
import File from "@/models/File";
import { requireAuth } from "@/lib/auth/session";
import { paginationSchema } from "@/lib/validators/schemas";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { createAuditLog } from "@/models/AuditLog";
import { escapeRegex } from "@/lib/utils/escape-regex";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

// Allowed extensions and corresponding mime types
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

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
 * Upload a file.
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
    const file = formData.get("file") as globalThis.File | null;
    const category = formData.get("category") as string || "other";

    if (!file) {
      return errorResponse("No file uploaded", 400);
    }

    // Validate extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return errorResponse("File extension not allowed. Allowed types: PDF, DOCX.", 400);
    }

    // Validate MIME type (if provided, fallback to browser type or basic checks)
    const mime = file.type || "application/octet-stream";
    if (mime !== "application/octet-stream" && !ALLOWED_MIME_TYPES.includes(mime)) {
      return errorResponse("File type not allowed.", 400);
    }

    // Validate size (max 10MB)
    const maxLimit = parseInt(process.env.MAX_FILE_SIZE || "10485760");
    if (file.size > maxLimit) {
      return errorResponse(`File too large. Max allowed is ${maxLimit / (1024 * 1024)}MB`, 400);
    }

    // Read file contents as ArrayBuffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate SHA-256 hash to prevent duplication and verify integrity
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Check if duplicate file already exists for this user
    const existingFile = await File.findOne({ userId: session.id, fileHash: hash });
    if (existingFile) {
      return successResponse({ file: existingFile, duplicate: true });
    }

    // Determine storage provider
    const provider = (process.env.FILE_STORAGE_PROVIDER || "local").toLowerCase();
    const uniqueKey = `${session.id}_${crypto.randomBytes(16).toString("hex")}_${path.basename(
      file.name
    )}`;

    if (provider === "s3" || provider === "r2") {
      const { uploadToS3 } = await import("@/lib/storage/s3");
      await uploadToS3(uniqueKey, buffer, mime);
    } else {
      const storageDir = path.resolve(process.env.FILE_STORAGE_PATH || "./uploads");
      await fs.mkdir(storageDir, { recursive: true });
      const fullPath = path.join(storageDir, uniqueKey);
      await fs.writeFile(fullPath, buffer);
    }

    // Create DB entry
    const doc = await File.create({
      userId: session.id,
      originalFileName: file.name,
      displayName: file.name,
      fileType: ext,
      mimeType: mime,
      fileSize: file.size,
      storageProvider: provider === "r2" ? "r2" : provider === "s3" ? "s3" : "local",
      storageKey: uniqueKey, // select: false so hidden from standard queries
      fileHash: hash,
      category,
    });

    await createAuditLog({
      userId: session.id,
      action: "file.uploaded",
      entityType: "file",
      entityId: doc._id.toString(),
      metadata: { originalFileName: file.name, fileSize: file.size, category },
      request,
    });

    return successResponse({ file: doc }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
