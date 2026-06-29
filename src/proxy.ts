import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { SECURITY_HEADERS } from "@/lib/security/headers";

/**
 * Next.js 16+ Proxy (formerly middleware.ts)
 *
 * Responsibilities:
 * - Redirect unauthenticated users away from protected routes
 * - Redirect authenticated users away from auth pages
 * - Add security headers to all responses
 * - CSRF protection via Origin verification on mutating requests
 *
 * This runs on the Edge and must be fast. No heavy DB operations.
 */

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/applications",
  "/companies",
  "/resumes",
  "/cover-letters",
  "/files",
  "/contacts",
  "/analytics",
  "/settings",
];

// Auth routes — redirect authenticated users away
const AUTH_ROUTES = ["/login", "/register"];

// API routes that require authentication
const PROTECTED_API_PREFIXES = [
  "/api/applications",
  "/api/companies",
  "/api/resumes",
  "/api/cover-letters",
  "/api/files",
  "/api/timeline",
  "/api/notes",
  "/api/contacts",
  "/api/reminders",
  "/api/analytics",
  "/api/import-job",
];

// Mutating HTTP methods that need CSRF protection
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// API routes exempt from CSRF Origin check (e.g., OAuth callbacks that come from Google)
const CSRF_EXEMPT_PATHS = ["/api/auth/google/callback"];

/**
 * Verify the Origin header matches our app URL for CSRF protection.
 * Returns true if the request is safe, false if it should be blocked.
 */
function verifyCsrfOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase();

  // GET/HEAD/OPTIONS are safe methods — no CSRF check needed
  if (!MUTATING_METHODS.has(method)) {
    return true;
  }

  const { pathname } = request.nextUrl;

  // Skip CSRF check for exempt paths
  if (CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p))) {
    return true;
  }

  // Only enforce on API routes
  if (!pathname.startsWith("/api/")) {
    return true;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const allowedOrigin = new URL(appUrl).origin;

  // Check Origin header first (most reliable)
  const origin = request.headers.get("origin");
  if (origin) {
    return origin === allowedOrigin;
  }

  // Fall back to Referer header
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === allowedOrigin;
    } catch {
      return false;
    }
  }

  // No Origin or Referer — block mutating requests (could be a direct curl/tool call,
  // but that's safe since those don't send cookies unless explicitly configured)
  return false;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // CSRF Origin verification for mutating API requests
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: cross-origin request blocked" },
      { status: 403 }
    );
  }

  const session = await getSessionFromRequest(request);
  const isAuthenticated = !!session;

  // Add security headers to all responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Check if this is a protected page route
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Check if this is a protected API route
  const isProtectedApi = PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Check if this is an auth page
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Unauthenticated user trying to access protected routes → redirect to login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Unauthenticated user trying to access protected API → 401
  if (!isAuthenticated && isProtectedApi) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401, headers: Object.fromEntries(response.headers) }
    );
  }

  // Authenticated user trying to access auth pages → redirect to dashboard
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
