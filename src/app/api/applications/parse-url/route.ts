import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { requireAuth } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api/response";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitHeaders,
} from "@/lib/rate-limit";

interface ParsedJobData {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  location: string;
  workMode: string;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  source: string;
}

/**
 * POST /api/applications/parse-url
 * Accepts { url: string }, fetches the page, and extracts job posting metadata.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    // Rate limit — use strict since this does external fetches
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(
      `parse-url:${session.id || ip}`,
      RATE_LIMITS.strict
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit, RATE_LIMITS.strict) }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format and protocol
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { success: false, error: "Only HTTP/HTTPS URLs are supported" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the page with a browser-like User-Agent
    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          {
            success: true,
            data: emptyResult(),
            warning: `Page returned status ${response.status}`,
          },
          { status: 200 }
        );
      }

      html = await response.text();
    } catch (err) {
      // Network errors are non-fatal — return empty result with warning
      return NextResponse.json(
        {
          success: true,
          data: emptyResult(),
          warning:
            err instanceof Error && err.name === "AbortError"
              ? "Request timed out. You can fill in the details manually."
              : "Could not fetch the page. You can fill in the details manually.",
        },
        { status: 200 }
      );
    }

    // Parse the HTML and extract job data
    const parsed = extractJobData(html, parsedUrl);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    return handleApiError(error);
  }
}

function emptyResult(): ParsedJobData {
  return {
    jobTitle: "",
    companyName: "",
    jobDescription: "",
    location: "",
    workMode: "",
    employmentType: "",
    salaryMin: null,
    salaryMax: null,
    currency: "USD",
    source: "Other",
  };
}

function extractJobData(html: string, url: URL): ParsedJobData {
  const $ = cheerio.load(html);
  const result = emptyResult();

  // ─── 1. Try JSON-LD structured data (most reliable) ───
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).text();
      const json = JSON.parse(raw);
      // Handle both single objects and arrays
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        // Walk @graph if present
        const candidates = item["@graph"]
          ? [...item["@graph"], item]
          : [item];

        for (const obj of candidates) {
          if (
            obj["@type"] === "JobPosting" ||
            obj["@type"]?.includes?.("JobPosting")
          ) {
            applyJobPostingSchema(result, obj);
            break;
          }
        }
      }
    } catch {
      // Invalid JSON-LD — skip
    }
  });

  // ─── 2. Open Graph / Meta tags as fallback ───
  if (!result.jobTitle) {
    result.jobTitle =
      getMeta($, "og:title") ||
      getMeta($, "twitter:title") ||
      $("title").first().text().trim() ||
      "";
    // Clean common suffixes like " | Company - LinkedIn"
    result.jobTitle = result.jobTitle
      .replace(/\s*[\|–—-]\s*(LinkedIn|Indeed|Glassdoor|ZipRecruiter|Lever|Greenhouse|Workday).*$/i, "")
      .trim();
  }

  if (!result.jobDescription) {
    result.jobDescription =
      getMeta($, "og:description") ||
      getMeta($, "description") ||
      getMeta($, "twitter:description") ||
      "";
  }

  // ─── 3. Detect source from hostname ───
  result.source = detectSource(url.hostname);

  // ─── 4. Try to extract company name from common patterns ───
  if (!result.companyName) {
    // Many job boards put "Job Title at Company" or "Job Title - Company" in the title
    const titleText = $("title").first().text().trim();
    const atMatch = titleText.match(/(?:at|@)\s+(.+?)(?:\s*[\|–—-]|$)/i);
    if (atMatch) {
      result.companyName = atMatch[1].trim();
    }
    // Try og:site_name
    if (!result.companyName) {
      result.companyName = getMeta($, "og:site_name") || "";
    }
  }

  // ─── 5. Try to infer work mode from description text ───
  if (!result.workMode && result.jobDescription) {
    const desc = result.jobDescription.toLowerCase();
    if (
      desc.includes("fully remote") ||
      desc.includes("100% remote") ||
      desc.includes("work from home") ||
      desc.includes("remote position") ||
      desc.includes("remote role")
    ) {
      result.workMode = "remote";
    } else if (desc.includes("hybrid")) {
      result.workMode = "hybrid";
    } else if (
      desc.includes("on-site") ||
      desc.includes("onsite") ||
      desc.includes("in-office") ||
      desc.includes("in office")
    ) {
      result.workMode = "onsite";
    }
  }

  // Truncate description to prevent massive payloads
  if (result.jobDescription.length > 5000) {
    result.jobDescription = result.jobDescription.slice(0, 5000);
  }

  return result;
}

function applyJobPostingSchema(
  result: ParsedJobData,
  obj: Record<string, unknown>
): void {
  if (typeof obj.title === "string") {
    result.jobTitle = obj.title;
  }

  // Description — strip HTML
  if (typeof obj.description === "string") {
    result.jobDescription = cheerio
      .load(obj.description)
      .text()
      .replace(/\s+/g, " ")
      .trim();
  }

  // Company — hiringOrganization
  const org = obj.hiringOrganization as Record<string, unknown> | undefined;
  if (org && typeof org.name === "string") {
    result.companyName = org.name;
  }

  // Location
  const loc = obj.jobLocation as Record<string, unknown> | Record<string, unknown>[] | undefined;
  if (loc) {
    const locations = Array.isArray(loc) ? loc : [loc];
    const parts: string[] = [];
    for (const l of locations) {
      const addr = l.address as Record<string, unknown> | undefined;
      if (addr) {
        const city = addr.addressLocality || "";
        const region = addr.addressRegion || "";
        const country = addr.addressCountry || "";
        const locationStr = [city, region, country]
          .filter(Boolean)
          .join(", ");
        if (locationStr) parts.push(locationStr as string);
      }
    }
    result.location = parts.join(" / ");
  }

  // Work mode from jobLocationType
  if (typeof obj.jobLocationType === "string") {
    const jlt = obj.jobLocationType.toLowerCase();
    if (jlt.includes("remote")) result.workMode = "remote";
    else if (jlt.includes("hybrid")) result.workMode = "hybrid";
  }

  // Employment type
  if (typeof obj.employmentType === "string") {
    const et = obj.employmentType.toLowerCase().replace(/_/g, "-");
    if (et.includes("full")) result.employmentType = "full-time";
    else if (et.includes("part")) result.employmentType = "part-time";
    else if (et.includes("contract")) result.employmentType = "contract";
    else if (et.includes("intern")) result.employmentType = "internship";
  }

  // Salary
  const salary = obj.baseSalary as Record<string, unknown> | undefined;
  if (salary) {
    const value = salary.value as Record<string, unknown> | number | undefined;
    if (typeof value === "number") {
      result.salaryMin = value;
    } else if (value && typeof value === "object") {
      if (typeof value.minValue === "number") result.salaryMin = value.minValue;
      if (typeof value.maxValue === "number") result.salaryMax = value.maxValue;
    }
    if (typeof salary.currency === "string") {
      result.currency = salary.currency;
    }
  }
}

function getMeta($: cheerio.CheerioAPI, name: string): string {
  return (
    $(`meta[property="${name}"]`).attr("content") ||
    $(`meta[name="${name}"]`).attr("content") ||
    ""
  ).trim();
}

function detectSource(hostname: string): string {
  const h = hostname.toLowerCase();
  if (h.includes("linkedin")) return "LinkedIn";
  if (h.includes("indeed")) return "Indeed";
  if (h.includes("glassdoor")) return "Glassdoor";
  // Lever, Greenhouse, Workday, BambooHR are typically company career pages
  if (
    h.includes("lever.co") ||
    h.includes("greenhouse.io") ||
    h.includes("workday.com") ||
    h.includes("bamboohr.com") ||
    h.includes("ashbyhq.com") ||
    h.includes("myworkdayjobs.com")
  ) {
    return "Company site";
  }
  return "Other";
}
