import SecurityBan from "@/models/SecurityBan";
import { AppError } from "@/lib/api/app-error";
import { createAuditLog } from "@/models/AuditLog";

// Security configurations with environment variable overrides
const MAX_IP_FAILURES = Number(process.env.SECURITY_MAX_IP_FAILURES) || 5;
const IP_BAN_DURATION_MS = (Number(process.env.SECURITY_IP_BAN_DURATION_MINUTES) || 15) * 60 * 1000;

const MAX_EMAIL_FAILURES = Number(process.env.SECURITY_MAX_EMAIL_FAILURES) || 5;
const EMAIL_BAN_DURATION_MS =
  (Number(process.env.SECURITY_EMAIL_BAN_DURATION_MINUTES) || 15) * 60 * 1000;

// Sliding window duration (failure counts reset if no failures within this window)
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if the given IP address or email is currently banned.
 * Throws an AppError (429) if a ban is active.
 */
export async function checkLoginBan(ip: string, email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const emailIdentifier = `email:${normalizedEmail}`;
  const identifiers = [emailIdentifier];

  if (ip && ip !== "unknown") {
    identifiers.push(`ip:${ip}`);
  }

  // Find any active bans
  const activeBans = await SecurityBan.find({
    identifier: { $in: identifiers },
    blockedUntil: { $gt: new Date() },
  });

  if (activeBans.length > 0) {
    const ipBan = activeBans.find((ban) => ban.type === "ip");
    const emailBan = activeBans.find((ban) => ban.type === "email");

    if (ipBan && ipBan.blockedUntil) {
      const waitMinutes = Math.ceil((ipBan.blockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        `Too many failed attempts from this IP. Access temporarily locked. Please try again in ${waitMinutes} minute${waitMinutes !== 1 ? "s" : ""}.`,
        429
      );
    }

    if (emailBan && emailBan.blockedUntil) {
      const waitMinutes = Math.ceil((emailBan.blockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        `This account has been temporarily locked due to too many failed login attempts. Please try again in ${waitMinutes} minute${waitMinutes !== 1 ? "s" : ""}.`,
        429
      );
    }
  }
}

/**
 * Record a login failure for the given IP address and email.
 * Increments the failure count and sets a temporary ban if thresholds are reached.
 */
export async function recordLoginFailure(
  ip: string,
  email: string,
  request?: Request
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const emailIdentifier = `email:${normalizedEmail}`;
  const now = new Date();

  // 1. Log the failed login attempt to the audit log
  if (request) {
    await createAuditLog({
      userId: "000000000000000000000000", // System/Unauthenticated user ID placeholder
      action: "user.login_failed",
      entityType: "user",
      entityId: normalizedEmail,
      metadata: {
        ip,
        email: normalizedEmail,
      },
      request,
    });
  }

  // 2. Update failure counts and potentially trigger ban for both IP and Email
  if (ip && ip !== "unknown") {
    await updateFailureCount(
      `ip:${ip}`,
      "ip",
      ip,
      MAX_IP_FAILURES,
      IP_BAN_DURATION_MS,
      now,
      request
    );
  }
  await updateFailureCount(
    emailIdentifier,
    "email",
    normalizedEmail,
    MAX_EMAIL_FAILURES,
    EMAIL_BAN_DURATION_MS,
    now,
    request
  );
}

/**
 * Reset failed attempt counters for both the given IP and email after a successful login.
 */
export async function recordLoginSuccess(ip: string, email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const emailIdentifier = `email:${normalizedEmail}`;
  const identifiers = [emailIdentifier];

  if (ip && ip !== "unknown") {
    identifiers.push(`ip:${ip}`);
  }

  // Reset tracking records
  await SecurityBan.deleteMany({
    identifier: { $in: identifiers },
  });
}

/**
 * Helper to update a security ban record failure count and handle ban timeouts.
 */
async function updateFailureCount(
  identifier: string,
  type: "ip" | "email",
  value: string,
  maxFailures: number,
  banDurationMs: number,
  now: Date,
  request?: Request
): Promise<void> {
  let banRecord = await SecurityBan.findOne({ identifier });

  if (!banRecord) {
    banRecord = new SecurityBan({
      identifier,
      type,
      value,
      failedCount: 1,
      firstFailureAt: now,
      lastFailureAt: now,
    });
  } else {
    // If the last failure was outside the rolling window, reset the counter
    const timeSinceLastFailure = now.getTime() - banRecord.lastFailureAt.getTime();
    if (timeSinceLastFailure > FAILURE_WINDOW_MS) {
      banRecord.failedCount = 1;
      banRecord.firstFailureAt = now;
    } else {
      banRecord.failedCount += 1;
    }
    banRecord.lastFailureAt = now;
  }

  // Check if threshold crossed
  if (banRecord.failedCount >= maxFailures) {
    const blockedUntil = new Date(now.getTime() + banDurationMs);
    banRecord.blockedUntil = blockedUntil;

    console.warn(
      `[SECURITY] Banned ${type}: ${value} until ${blockedUntil.toISOString()} due to ${banRecord.failedCount} failures.`
    );

    if (request) {
      await createAuditLog({
        userId: "000000000000000000000000",
        action: "security.ban_triggered",
        entityType: type,
        entityId: value,
        metadata: {
          identifier,
          failedCount: banRecord.failedCount,
          blockedUntil: blockedUntil.toISOString(),
        },
        request,
      });
    }
  }

  await banRecord.save();
}

/**
 * Validate that the email does not belong to a known disposable/temporary email provider.
 * Protects registration against spam/automated signups.
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "yopmail.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "dispostable.com",
  "getairmail.com",
  "maildrop.cc",
  "mintemail.com",
  "temp-mail.org",
  "throwawaymail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split("@")[1];
  return DISPOSABLE_DOMAINS.has(domain);
}
