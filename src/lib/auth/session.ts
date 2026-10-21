import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { createHash, randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "1d") as StringValue;
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as StringValue;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  mustChangePassword?: boolean;
  sessionVersion?: number;
}

interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  mustChangePassword?: boolean;
  sessionVersion?: number;
  iat?: number;
  exp?: number;
}

// Cookie names
const ACCESS_TOKEN_COOKIE = "aos_access_token";
const REFRESH_TOKEN_COOKIE = "aos_refresh_token";

/**
 * SHA-256 hash a token for safe storage in the database.
 * Never store raw tokens — only their hashes.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate an access token (short-lived)
 */
export function generateAccessToken(user: SessionUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      // Lets the proxy lock the session to /change-password without a DB lookup
      mustChangePassword: !!user.mustChangePassword,
      sessionVersion: user.sessionVersion ?? 0,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate a refresh token (long-lived)
 */
export function generateRefreshToken(user: SessionUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      sessionVersion: user.sessionVersion ?? 0,
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      // Unique ID so two tokens issued in the same second don't collide on tokenHash
      jwtid: randomUUID(),
    }
  );
}

/**
 * Verify an access token and return the payload
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token and return the payload
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Base64Url decode helper
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return atob(base64);
}

/**
 * Verify an access token asynchronously using Web Crypto API (supported in Edge and Node)
 */
export async function verifyAccessTokenEdge(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header and verify alg
    const header = JSON.parse(base64UrlDecode(headerB64));
    if (header.alg !== "HS256") return null;

    // Import HMAC key using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(JWT_SECRET);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Decode signature from base64url to Uint8Array
    const signatureStr = base64UrlDecode(signatureB64);
    const signatureBytes = new Uint8Array(signatureStr.length);
    for (let i = 0; i < signatureStr.length; i++) {
      signatureBytes[i] = signatureStr.charCodeAt(i);
    }

    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    // Verify signature
    const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, data);

    if (!isValid) return null;

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as TokenPayload;

    // Validate expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Set auth cookies with security flags.
 * Access token: short-lived, HTTP-only, Secure, SameSite=Lax
 * Refresh token: long-lived, HTTP-only, Secure, SameSite=Strict, path=/api/auth
 *
 * Returns the raw refresh token so the caller can store its hash in the DB.
 */
export async function setAuthCookies(user: SessionUser): Promise<string> {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const cookieStore = await cookies();

  // Access token cookie
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
  });

  // Refresh token cookie — restricted to auth endpoints only
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return refreshToken;
}

/**
 * Clear auth cookies on logout
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

/**
 * Get the current session user from cookies (for server components & route handlers)
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    mustChangePassword: !!payload.mustChangePassword,
    sessionVersion: payload.sessionVersion ?? 0,
  };
}

/**
 * Get session from a NextRequest (for proxy.ts / middleware)
 * Does NOT use the async cookies() API — reads from request directly.
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAccessTokenEdge(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    mustChangePassword: !!payload.mustChangePassword,
    sessionVersion: payload.sessionVersion ?? 0,
  };
}
