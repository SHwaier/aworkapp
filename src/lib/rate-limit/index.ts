/**
 * In-memory rate limiter for API routes.
 * Uses a sliding window counter pattern.
 *
 * LIMITATION: In-memory state is NOT shared across serverless instances.
 * For multi-instance deployments (Vercel, etc.), this provides best-effort
 * protection only. Auth-critical endpoints are additionally protected by
 * the MongoDB-backed brute-force system (src/lib/security/brute-force.ts).
 *
 * To upgrade: replace with @upstash/ratelimit or a Redis-backed limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

/** Default rate limit presets */
export const RATE_LIMITS = {
  /** Login/register: 5 attempts per minute */
  auth: { windowMs: 60_000, maxRequests: 5 },
  /** File uploads: 10 per minute */
  upload: { windowMs: 60_000, maxRequests: 10 },
  /** General API: 60 per minute */
  api: { windowMs: 60_000, maxRequests: 60 },
  /** Strict: 3 per minute (registration, password reset) */
  strict: { windowMs: 60_000, maxRequests: 3 },
} as const;

/**
 * Check if a request is within rate limits.
 *
 * @param identifier - Unique key for the rate limit (e.g., IP + endpoint)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry or window expired — allow
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      retryAfterMs: 0,
    };
  }

  // Within window — increment
  entry.count += 1;

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
    retryAfterMs: 0,
  };
}

/**
 * Get the client IP from request headers.
 * Checks common reverse proxy headers with priority order.
 * Falls back to a fingerprint hash rather than a shared "unknown" bucket.
 */
export function getClientIp(request: Request): string {
  // Standard proxy header (Vercel, Cloudflare, nginx, etc.)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Cloudflare
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  // Vercel
  const vercelIp = request.headers.get("x-real-ip");
  if (vercelIp) {
    return vercelIp.trim();
  }

  // Fallback: fingerprint from available headers to avoid shared bucket
  const ua = request.headers.get("user-agent") || "";
  const accept = request.headers.get("accept-language") || "";
  return `fp:${simpleHash(ua + accept)}`;
}

/** Simple non-crypto hash for fingerprinting (not security-critical) */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult, config?: RateLimitConfig): HeadersInit {
  return {
    "X-RateLimit-Limit": (config?.maxRequests ?? result.remaining).toString(),
    "X-RateLimit-Remaining": Math.max(0, result.remaining).toString(),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
    ...(result.retryAfterMs > 0 && {
      "Retry-After": Math.ceil(result.retryAfterMs / 1000).toString(),
    }),
  };
}
