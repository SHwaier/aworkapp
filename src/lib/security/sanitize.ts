/**
 * Input sanitization utilities.
 * Prevents XSS and injection attacks on user-provided content.
 */

/**
 * Strip HTML tags from a string.
 * Use for plain-text fields like names, titles, etc.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a string for safe storage and display.
 * Escapes HTML entities to prevent XSS.
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return input.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Sanitize a URL — only allow http and https schemes.
 * Returns null if the URL is invalid or uses a dangerous scheme.
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    // Block localhost and private networks
    const hostname = parsed.hostname.toLowerCase();
    if (isPrivateHost(hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Check if a hostname resolves to a private/internal network.
 * Prevents SSRF attacks.
 */
function isPrivateHost(hostname: string): boolean {
  // Block localhost variations
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return true;
  }

  // Block private IP ranges
  const privateRanges = [
    /^10\.\d+\.\d+\.\d+$/,           // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // 172.16.0.0/12
    /^192\.168\.\d+\.\d+$/,          // 192.168.0.0/16
    /^169\.254\.\d+\.\d+$/,          // Link-local
    /^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\.\d+\.\d+$/, // CGNAT
  ];

  // Block cloud metadata endpoints
  const metadataHosts = [
    "169.254.169.254",   // AWS/GCP metadata
    "metadata.google.internal",
    "metadata.google.com",
  ];

  if (metadataHosts.includes(hostname)) {
    return true;
  }

  return privateRanges.some((range) => range.test(hostname));
}

/**
 * Trim and normalize whitespace in a string.
 */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize a general text input — trim, normalize, and limit length.
 */
export function sanitizeText(
  input: string,
  maxLength: number = 10000
): string {
  return normalizeWhitespace(stripHtml(input)).slice(0, maxLength);
}
