import { format, formatDistanceToNow, isThisYear } from "date-fns";

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Oct 21" this year, "Oct 21, 2025" otherwise. */
export function formatDay(date: string | Date): string {
  const d = new Date(date);
  return format(d, isThisYear(d) ? "MMM d" : "MMM d, yyyy");
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function fileKind(v: { mimeType: string; fileType: string }): "PDF" | "Word" | "File" {
  if (v.mimeType === "application/pdf" || v.fileType === ".pdf") return "PDF";
  if (v.mimeType.includes("wordprocessingml") || v.fileType === ".docx") return "Word";
  return "File";
}

/** A date-only field (stored as UTC midnight) as a local date, so it doesn't shift a day. */
export function calendarDay(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

/** A date that may be date-only (UTC midnight) or a real timestamp. */
export function eventDay(value: string): Date {
  return value.endsWith("T00:00:00.000Z") ? calendarDay(value) : new Date(value);
}
