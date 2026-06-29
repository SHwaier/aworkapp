/**
 * Brute-force protection using MongoDB-backed login attempt tracking.
 *
 * Reads lockout thresholds from environment variables:
 * - SECURITY_MAX_IP_FAILURES (default: 10)
 * - SECURITY_IP_BAN_DURATION_MINUTES (default: 15)
 * - SECURITY_MAX_EMAIL_FAILURES (default: 5)
 * - SECURITY_EMAIL_BAN_DURATION_MINUTES (default: 15)
 */

import LoginAttempt from "@/models/LoginAttempt";

const MAX_IP_FAILURES = parseInt(process.env.SECURITY_MAX_IP_FAILURES || "10", 10);
const IP_BAN_MINUTES = parseInt(process.env.SECURITY_IP_BAN_DURATION_MINUTES || "15", 10);
const MAX_EMAIL_FAILURES = parseInt(process.env.SECURITY_MAX_EMAIL_FAILURES || "5", 10);
const EMAIL_BAN_MINUTES = parseInt(process.env.SECURITY_EMAIL_BAN_DURATION_MINUTES || "15", 10);

export interface BruteForceResult {
  blocked: boolean;
  reason?: "ip" | "email";
  retryAfterMinutes?: number;
}

/**
 * Check if a login attempt should be blocked based on recent failure history.
 * Must be called AFTER dbConnect().
 */
export async function checkBruteForce(email: string, ip: string): Promise<BruteForceResult> {
  const now = new Date();

  // Check IP-based failures within the ban window
  const ipWindowStart = new Date(now.getTime() - IP_BAN_MINUTES * 60 * 1000);
  const ipFailures = await LoginAttempt.countDocuments({
    ip,
    success: false,
    createdAt: { $gte: ipWindowStart },
  });

  if (ipFailures >= MAX_IP_FAILURES) {
    return {
      blocked: true,
      reason: "ip",
      retryAfterMinutes: IP_BAN_MINUTES,
    };
  }

  // Check email-based failures within the ban window
  const emailWindowStart = new Date(now.getTime() - EMAIL_BAN_MINUTES * 60 * 1000);
  const emailFailures = await LoginAttempt.countDocuments({
    email: email.toLowerCase(),
    success: false,
    createdAt: { $gte: emailWindowStart },
  });

  if (emailFailures >= MAX_EMAIL_FAILURES) {
    return {
      blocked: true,
      reason: "email",
      retryAfterMinutes: EMAIL_BAN_MINUTES,
    };
  }

  return { blocked: false };
}

/**
 * Record a login attempt (success or failure).
 */
export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean,
  userAgent: string = ""
): Promise<void> {
  await LoginAttempt.create({
    email: email.toLowerCase(),
    ip,
    success,
    userAgent,
  });
}
