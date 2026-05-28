import { NextResponse } from "next/server";
import { clearAuthCookies, getSession } from "@/lib/auth/session";
import { createAuditLog } from "@/models/AuditLog";
import { successResponse, handleApiError } from "@/lib/api/response";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (session) {
      await createAuditLog({
        userId: session.id,
        action: "user.logout",
        entityType: "user",
        entityId: session.id,
        request,
      });
    }

    await clearAuthCookies();

    return successResponse({ message: "Logged out successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
