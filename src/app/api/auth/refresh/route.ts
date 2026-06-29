import {
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  hashToken,
  type SessionUser,
} from "@/lib/auth/session";
import dbConnect from "@/lib/db/mongoose";
import RefreshToken from "@/models/RefreshToken";
import { cookies } from "next/headers";
import { successResponse, errorResponse } from "@/lib/api/response";
import { v4 as uuidv4 } from "uuid";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const rawRefreshToken = cookieStore.get("aos_refresh_token")?.value;

    if (!rawRefreshToken) {
      await clearAuthCookies();
      return errorResponse("No refresh token found", 401);
    }

    // Verify JWT signature and expiry
    const payload = verifyRefreshToken(rawRefreshToken);

    if (!payload) {
      await clearAuthCookies();
      return errorResponse("Invalid or expired refresh token", 401);
    }

    // Look up token hash in database for rotation checks
    await dbConnect();
    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken) {
      // Token not found — was never issued or already rotated out
      await clearAuthCookies();
      return errorResponse("Invalid refresh token", 401);
    }

    if (storedToken.isRevoked) {
      // Token was explicitly revoked (e.g., logout)
      await clearAuthCookies();
      return errorResponse("Refresh token has been revoked", 401);
    }

    if (storedToken.isUsed) {
      // THEFT DETECTED: a previously-used token is being replayed.
      // Revoke the entire token family to lock out the attacker.
      await RefreshToken.updateMany({ family: storedToken.family }, { $set: { isRevoked: true } });
      await clearAuthCookies();
      console.warn(
        `[SECURITY] Refresh token reuse detected for user ${payload.userId}, family ${storedToken.family}. All tokens in family revoked.`
      );
      return errorResponse("Suspicious activity detected. Please log in again.", 401);
    }

    // Mark current token as used (one-time use)
    storedToken.isUsed = true;
    await storedToken.save();

    const user: SessionUser = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
    };

    // Issue new token pair
    const newRefreshToken = await setAuthCookies(user);

    // Store new refresh token hash in the same family
    await RefreshToken.create({
      tokenHash: hashToken(newRefreshToken),
      userId: storedToken.userId,
      family: storedToken.family,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return successResponse({ user });
  } catch (error) {
    console.error("Refresh token error:", error);
    await clearAuthCookies();
    return errorResponse("Internal server error", 500);
  }
}
