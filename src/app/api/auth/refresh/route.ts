import {
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  type SessionUser,
} from "@/lib/auth/session";
import { cookies } from "next/headers";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("aos_refresh_token")?.value;

    if (!refreshToken) {
      await clearAuthCookies();
      return errorResponse("No refresh token found", 401);
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      await clearAuthCookies();
      return errorResponse("Invalid or expired refresh token", 401);
    }

    const user: SessionUser = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
    };

    // Set new tokens (both access and refresh)
    await setAuthCookies(user);

    return successResponse({ user });
  } catch (error) {
    console.error("Refresh token error:", error);
    await clearAuthCookies();
    return errorResponse("Internal server error", 500);
  }
}
