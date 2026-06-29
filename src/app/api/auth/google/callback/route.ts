import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import RefreshToken from "@/models/RefreshToken";
import { setAuthCookies, hashToken } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawState = searchParams.get("state");
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle Google errors (user denied, etc.)
  if (errorParam) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorParam)}`, appUrl));
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Google authentication failed: missing authorization code", appUrl)
    );
  }

  // === CSRF: Verify state nonce matches cookie ===
  const cookieStore = await cookies();
  const storedNonce = cookieStore.get("oauth_state_nonce")?.value;

  // Clear the nonce cookie regardless of outcome
  cookieStore.delete("oauth_state_nonce");

  let callbackUrl = "/dashboard";
  if (rawState) {
    try {
      const state = JSON.parse(decodeURIComponent(rawState));

      if (!storedNonce || !state.nonce || state.nonce !== storedNonce) {
        return NextResponse.redirect(
          new URL("/login?error=Invalid OAuth state. Please try again.", appUrl)
        );
      }

      // Validate callback URL is a safe relative path (prevent open redirect)
      if (state.callbackUrl && typeof state.callbackUrl === "string") {
        const cb = state.callbackUrl;
        // Only allow relative paths starting with /
        if (cb.startsWith("/") && !cb.startsWith("//")) {
          callbackUrl = cb;
        }
      }
    } catch {
      return NextResponse.redirect(new URL("/login?error=Invalid OAuth state format", appUrl));
    }
  } else if (!storedNonce) {
    // No state AND no nonce cookie — this is suspicious
    return NextResponse.redirect(
      new URL("/login?error=OAuth session expired. Please try again.", appUrl)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/login?error=Google OAuth server configuration is missing", appUrl)
    );
  }

  let email = "";
  let name = "";
  let googleId = "";
  let emailVerified = false;

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Google Token Exchange Error:", tokens);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(tokens.error_description || "Failed to exchange authorization code")}`,
          appUrl
        )
      );
    }

    // Fetch user profile info
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const profile = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error("Google Profile Fetch Error:", profile);
      return NextResponse.redirect(
        new URL("/login?error=Failed to retrieve user profile from Google", appUrl)
      );
    }

    // Require verified email — prevents account takeover via unverified Google emails
    emailVerified = profile.email_verified === true;
    if (!emailVerified) {
      return NextResponse.redirect(
        new URL(
          "/login?error=Google account email is not verified. Please verify your email with Google first.",
          appUrl
        )
      );
    }

    email = profile.email.toLowerCase().trim();
    name = profile.name || profile.given_name || "Google User";
    googleId = profile.sub; // Google's unique user ID
  } catch (err) {
    console.error("Google OAuth Callback Exception:", err);
    const message = err instanceof Error ? err.message : "OAuth callback exception";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, appUrl));
  }

  // Database operations: Find or create user
  try {
    await dbConnect();

    // First, try to find by googleId (most reliable)
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if a user with this email already exists (email/password registration)
      user = await User.findOne({ email });

      if (user) {
        // Link Google ID to existing account
        user.googleId = googleId;
        await user.save();
      } else {
        // Create new user with a secure random password hash
        const randomPassword = uuidv4() + uuidv4();
        const passwordHash = await hashPassword(randomPassword);

        user = await User.create({
          name,
          email,
          passwordHash,
          googleId,
        });
      }
    }

    // Sign in user: set cookies
    const sessionUser = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    const refreshToken = await setAuthCookies(sessionUser);

    // Store refresh token hash for rotation tracking
    const family = uuidv4();
    await RefreshToken.create({
      tokenHash: hashToken(refreshToken),
      userId: user._id,
      family,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return NextResponse.redirect(new URL(callbackUrl, appUrl));
  } catch (err) {
    console.error("DB Login/Registration Error during OAuth:", err);
    const message = err instanceof Error ? err.message : "Database login error";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, appUrl));
  }
}
