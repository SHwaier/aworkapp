import type { APPLICATION_STATUSES, LIFECYCLE_STAGES } from "@/lib/validators/schemas";

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/** Statuses grouped the way people think about a search, for the status picker */
export const STATUS_GROUPS: { label: string; statuses: ApplicationStatus[] }[] = [
  { label: "Before applying", statuses: ["Saved", "Interested", "Preparing documents"] },
  {
    label: "Applied",
    statuses: ["Applied", "Waiting for response", "Follow-up needed", "Follow-up sent"],
  },
  {
    label: "Screening",
    statuses: ["Recruiter contacted", "Screening scheduled", "Screening completed"],
  },
  {
    label: "Interviews",
    statuses: [
      "Interview scheduled",
      "Interview completed",
      "Technical assessment pending",
      "Technical assessment completed",
      "Final round",
    ],
  },
  { label: "Offer", statuses: ["Offer received", "Offer accepted", "Offer declined"] },
  { label: "Closed", statuses: ["Rejected", "Ghosted", "Withdrawn", "Closed / posting removed"] },
];

export type StatusTone = "neutral" | "active" | "attention" | "positive" | "negative";

const TONES: Partial<Record<string, StatusTone>> = {
  "Preparing documents": "attention",
  "Follow-up needed": "attention",
  "Technical assessment pending": "attention",
  Applied: "active",
  "Waiting for response": "active",
  "Follow-up sent": "active",
  "Recruiter contacted": "active",
  "Screening scheduled": "active",
  "Screening completed": "active",
  "Interview scheduled": "positive",
  "Interview completed": "positive",
  "Technical assessment completed": "positive",
  "Final round": "positive",
  "Offer received": "positive",
  "Offer accepted": "positive",
  "Offer declined": "neutral",
  Rejected: "negative",
  Ghosted: "negative",
  Withdrawn: "neutral",
  "Closed / posting removed": "neutral",
};

export function statusTone(status: string): StatusTone {
  return TONES[status] ?? "neutral";
}

/** Dot color for a status; always shown next to the status text, never alone */
export const TONE_DOT: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground/60",
  active: "bg-sky-500",
  attention: "bg-amber-500",
  positive: "bg-emerald-500",
  negative: "bg-red-500",
};

/** The stage track: each step covers one or more lifecycle stages */
export const STAGE_STEPS: { label: string; stages: LifecycleStage[] }[] = [
  { label: "Saved", stages: ["Saved"] },
  { label: "Applied", stages: ["Applied"] },
  { label: "Screening", stages: ["Screening received", "Screening completed"] },
  {
    label: "Interviews",
    stages: ["Interview scheduled", "Interview completed", "Technical assessment completed"],
  },
  { label: "Final round", stages: ["Final round completed"] },
  { label: "Offer", stages: ["Offer received"] },
];

export const OUTCOME_STAGES: LifecycleStage[] = ["Rejected", "Withdrawn"];

export function stepIndex(stage: string): number {
  return STAGE_STEPS.findIndex((s) => (s.stages as string[]).includes(stage));
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  status_change: "Status change",
  note: "Note",
  interview: "Interview",
  screening: "Screening",
  follow_up: "Follow-up",
  offer: "Offer",
  rejection: "Rejection",
  application_submitted: "Application submitted",
  document_submitted: "Document submitted",
  reminder: "Reminder",
  custom: "Other",
};

export const EVENT_TYPE_DOT: Record<string, string> = {
  status_change: "bg-muted-foreground/60",
  note: "bg-muted-foreground/60",
  interview: "bg-emerald-500",
  screening: "bg-sky-500",
  follow_up: "bg-amber-500",
  offer: "bg-emerald-500",
  rejection: "bg-red-500",
  application_submitted: "bg-sky-500",
  document_submitted: "bg-sky-500",
  reminder: "bg-amber-500",
  custom: "bg-muted-foreground/60",
};

export const NOTE_TYPE_LABELS: Record<string, string> = {
  general: "General",
  prep: "Prep",
  recruiter: "Recruiter",
  interview: "Interview",
  rejection: "Rejection",
  salary: "Salary",
  private: "Private",
  "red-flag": "Red flag",
};

export const WORK_MODE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
  "co-op": "Co-op",
};

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string
): string | null {
  // 0 means "not set" (the form stores an empty salary as 0)
  if (!min && !max) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      notation: n >= 10000 ? "compact" : "standard",
      maximumFractionDigits: n >= 10000 ? 1 : 0,
    }).format(n);
  if (min && max) return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
  return min ? `From ${fmt(min)}` : `Up to ${fmt(max!)}`;
}
