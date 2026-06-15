import { NextResponse } from "next/server";
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
      return NextResponse.json(errorResponse("No refresh token found", 401), { status: 401 });
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      await clearAuthCookies();
      return NextResponse.json(errorResponse("Invalid or expired refresh token", 401), {
        status: 401,
      });
    }

    const user: SessionUser = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
    };

    // Set new tokens (both access and refresh)
    await setAuthCookies(user);

    return NextResponse.json(successResponse({ user }, "Tokens refreshed successfully"));
  } catch (error) {
    console.error("Refresh token error:", error);
    await clearAuthCookies();
    return NextResponse.json(errorResponse("Internal server error", 500), { status: 500 });
  }
}
