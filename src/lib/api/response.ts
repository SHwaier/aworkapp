import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/api/app-error";

/**
 * Standard API response format.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Create a success response.
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create an error response.
 * Never exposes internal error details to the client.
 */
export function errorResponse(
  message: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Create a validation error response from Zod errors.
 */
export function validationErrorResponse(
  error: ZodError
): NextResponse<ApiResponse> {
  const errors = error.issues.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
  return NextResponse.json(
    { success: false, error: "Validation failed", errors },
    { status: 400 }
  );
}

/**
 * Handle API route errors consistently.
 * Logs the full error server-side, returns safe message to client.
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  // Zod validation errors
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }

  // AppError: business-logic errors that are safe to expose to clients
  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode);
  }

  // Known error messages (auth, not found, etc.) — backward compatibility
  if (error instanceof Error) {
    const safeMessages = [
      "Authentication required",
      "Not found",
      "Forbidden",
      "Invalid credentials",
      "Email already registered",
      "Rate limit exceeded",
    ];

    if (safeMessages.includes(error.message)) {
      const statusMap: Record<string, number> = {
        "Authentication required": 401,
        "Not found": 404,
        "Forbidden": 403,
        "Invalid credentials": 401,
        "Email already registered": 409,
        "Rate limit exceeded": 429,
      };
      return errorResponse(
        error.message,
        statusMap[error.message] || 400
      );
    }

    // Log unexpected errors
    console.error("API Error:", error);
  }

  // Generic error — never expose internals
  return errorResponse("An unexpected error occurred", 500);
}
