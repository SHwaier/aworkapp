import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse } from "@/lib/api/response";

/**
 * GET /api/auth/me
 * Returns the current authenticated user, or 401.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getSession();

  if (!session) {
    return errorResponse("Not authenticated", 401);
  }

  return successResponse({ user: session });
}
