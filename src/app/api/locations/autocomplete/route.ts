import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api/response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

// Simple in-memory cache for location search queries to save network calls and respect API usage guidelines
interface CacheEntry {
  suggestions: string[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate Limit check
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(
      `locations-autocomplete:${session.id || ip}`,
      RATE_LIMITS.api
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.api) }
      );
    }

    const url = new URL(request.url);
    const query = (url.searchParams.get("q") || "").trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const cacheKey = query.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.suggestions });
    }

    let suggestions: string[] = [];

    // ─── 1. Try Photon API (Elasticsearch over Nominatim data - very fast and autocomplete friendly) ───
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`,
        {
          headers: {
            "Accept-Language": "en",
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.features)) {
          suggestions = data.features.map((feature: any) => {
            const p = feature.properties;
            const parts: string[] = [];
            
            if (p.name) parts.push(p.name);
            if (p.city && p.city !== p.name) parts.push(p.city);
            if (p.state && p.state !== p.name && p.state !== p.city) parts.push(p.state);
            if (p.country) parts.push(p.country);

            return parts.filter(Boolean).join(", ");
          });
        }
      }
    } catch {
      // Fail silently to try Nominatim fallback
    }

    // ─── 2. Fallback to OpenStreetMap Nominatim ───
    if (suggestions.length === 0) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            query
          )}&format=json&accept-language=en&limit=10`,
          {
            headers: {
              // Nominatim strictly requires a valid User-Agent identifying the application
              "User-Agent": "ApplicationOS-JobTracker/1.0 (contact@example.com)",
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            suggestions = data.map((item: any) => item.display_name);
          }
        }
      } catch {
        // Both failed
      }
    }

    // Filter, deduplicate, and clean suggestions
    const uniqueSuggestions = Array.from(new Set(suggestions))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Save to in-memory cache
    cache.set(cacheKey, {
      suggestions: uniqueSuggestions,
      timestamp: Date.now(),
    });

    // Clean up cache if it grows too large
    if (cache.size > 2000) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }

    return NextResponse.json({ success: true, data: uniqueSuggestions });
  } catch (error) {
    return handleApiError(error);
  }
}
