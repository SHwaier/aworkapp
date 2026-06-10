import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import { setAuthCookies } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "/dashboard";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUrl = decodeURIComponent(state);

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Google authentication failed: missing authorization code", appUrl)
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

    email = profile.email.toLowerCase().trim();
    name = profile.name || profile.given_name || "Google User";
  } catch (err) {
    console.error("Google OAuth Callback Exception:", err);
    const message = err instanceof Error ? err.message : "OAuth callback exception";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, appUrl));
  }

  // Database operations: Find or create user
  try {
    await dbConnect();
    let user = await User.findOne({ email });

    if (!user) {
      // Create user with a secure random password hash
      const randomPassword = uuidv4() + uuidv4();
      const passwordHash = await hashPassword(randomPassword);

      user = await User.create({
        name,
        email,
        passwordHash,
      });
    }

    // Sign in user: set cookies
    await setAuthCookies({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return NextResponse.redirect(new URL(redirectUrl, appUrl));
  } catch (err) {
    console.error("DB Login/Registration Error during OAuth:", err);
    const message = err instanceof Error ? err.message : "Database login error";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, appUrl));
  }
}
