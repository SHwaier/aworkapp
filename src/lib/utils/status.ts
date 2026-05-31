/**
 * Shared status color mapping for application status badges.
 * Extracted from dashboard, applications, and application detail pages
 * to avoid duplication.
 */
export function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  const positive = [
    "Offer received",
    "Offer accepted",
    "Interview scheduled",
    "Interview completed",
    "Final round",
  ];
  const negative = [
    "Rejected",
    "Ghosted",
    "Withdrawn",
    "Closed / posting removed",
  ];
  const warning = [
    "Follow-up needed",
    "Technical assessment pending",
    "Preparing documents",
  ];

  if (positive.includes(status)) return "default";
  if (negative.includes(status)) return "destructive";
  if (warning.includes(status)) return "secondary";
  return "outline";
}
