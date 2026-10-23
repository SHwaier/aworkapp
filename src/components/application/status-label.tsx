import { cn } from "@/lib/utils";
import { statusTone, TONE_DOT } from "./status";

/** An application status as a colored dot plus text (never color alone, no pill). */
export function StatusLabel({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span
        className={cn("inline-block h-2 w-2 shrink-0 rounded-full", TONE_DOT[statusTone(status)])}
        aria-hidden
      />
      {status}
    </span>
  );
}
