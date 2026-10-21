import mongoose from "mongoose";
import AiUsage from "@/models/AiUsage";
import User from "@/models/User";
import { getAppSettings } from "@/models/AppSettings";
import { AppError } from "@/lib/api/app-error";

const USAGE_RETENTION_DAYS = 35;

/** Current UTC day as YYYY-MM-DD. Limits reset at midnight UTC. */
export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Start of the next UTC day — when today's usage resets. */
export function nextResetAt(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

export interface AiQuotaStatus {
  used: number;
  /** null = unlimited */
  limit: number | null;
  /** Where the limit comes from: the member override, the app default, or the admin exemption */
  source: "member" | "default" | "admin_exempt";
  resetsAt: Date;
}

async function resolveLimit(userId: string): Promise<Pick<AiQuotaStatus, "limit" | "source">> {
  const [user, settings] = await Promise.all([
    User.findById(userId).select("role aiDailyLimit").lean(),
    getAppSettings(),
  ]);
  if (!user) throw new AppError("Authentication required", 401);

  if (user.role === "admin" && settings.aiExemptAdmins) {
    return { limit: null, source: "admin_exempt" };
  }
  if (user.aiDailyLimit !== null && user.aiDailyLimit !== undefined) {
    return { limit: user.aiDailyLimit, source: "member" };
  }
  return { limit: settings.aiDailyLimit, source: "default" };
}

export async function getAiQuota(userId: string): Promise<AiQuotaStatus> {
  const [{ limit, source }, usage] = await Promise.all([
    resolveLimit(userId),
    AiUsage.findOne({ userId, day: utcDay() }).select("count").lean(),
  ]);
  return { used: usage?.count ?? 0, limit, source, resetsAt: nextResetAt() };
}

/**
 * Use one unit of today's AI quota, or throw 429 if the limit is reached.
 * Atomic: concurrent requests can't push usage past the limit.
 */
export async function consumeAiQuota(userId: string): Promise<AiQuotaStatus> {
  const { limit, source } = await resolveLimit(userId);
  const day = utcDay();
  const resetsAt = nextResetAt();
  const expireAt = new Date(resetsAt.getTime() + USAGE_RETENTION_DAYS * 86_400_000);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  if (limit === null) {
    const doc = await AiUsage.findOneAndUpdate(
      { userId: userObjectId, day },
      { $inc: { count: 1 }, $setOnInsert: { expireAt } },
      { upsert: true, new: true }
    ).lean();
    return { used: doc?.count ?? 1, limit, source, resetsAt };
  }

  const exceeded = () =>
    new AppError(
      limit === 0
        ? "AI analysis is turned off for your account. Contact an admin."
        : `You've used all ${limit} AI analyses for today. Your limit resets at midnight UTC.`,
      429
    );

  if (limit === 0) throw exceeded();

  try {
    // Only matches while under the limit; once at the limit the upsert tries to
    // insert a duplicate (userId, day) and fails, which means "exceeded".
    const doc = await AiUsage.findOneAndUpdate(
      { userId: userObjectId, day, count: { $lt: limit } },
      { $inc: { count: 1 }, $setOnInsert: { expireAt } },
      { upsert: true, new: true }
    ).lean();
    return { used: doc?.count ?? 1, limit, source, resetsAt };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw exceeded();
    throw err;
  }
}

/** Give back a unit consumed by a run that failed on our side. */
export async function refundAiQuota(userId: string, day: string): Promise<void> {
  await AiUsage.updateOne({ userId, day, count: { $gt: 0 } }, { $inc: { count: -1 } });
}

/** Admin action: clear a member's usage for today. */
export async function resetAiUsage(userId: string): Promise<void> {
  await AiUsage.deleteOne({ userId, day: utcDay() });
}
