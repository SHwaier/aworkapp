import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) {
    console.error("Google OAuth client configuration is missing.");
    return NextResponse.redirect(
      new URL(
        "/login?error=Google authentication is currently unavailable (missing server configuration)",
        appUrl
      )
    );
  }

  // Generate a cryptographic nonce for CSRF protection
  const nonce = randomBytes(32).toString("hex");

  // Store nonce in a short-lived httpOnly cookie for verification on callback
  const cookieStore = await cookies();
  cookieStore.set("oauth_state_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Must be lax to survive the redirect from Google
    path: "/api/auth/google/callback",
    maxAge: 10 * 60, // 10 minutes — enough for the OAuth flow
  });

  // Encode both nonce and callback URL in the state parameter
  const state = JSON.stringify({ nonce, callbackUrl });

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", `${appUrl}/api/auth/google/callback`);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", encodeURIComponent(state));
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(googleAuthUrl);
}
