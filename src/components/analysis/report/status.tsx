import { CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react";
import type { BenchmarkStatus } from "@/lib/ai/analysis/types";
import { TONE_VAR } from "../charts";
import { cn } from "@/lib/utils";

export const BENCHMARK_STATUS: Record<
  BenchmarkStatus,
  {
    label: string;
    /** Icon color */
    color: string;
    /** Fill in the status strip; "adequate" uses a lighter neutral so problems stand out */
    bar: string;
    Icon: typeof CircleCheck;
    order: number;
  }
> = {
  missing: {
    label: "Missing",
    color: TONE_VAR.critical,
    bar: TONE_VAR.critical,
    Icon: CircleX,
    order: 0,
  },
  weak: {
    label: "Needs work",
    color: TONE_VAR.warning,
    bar: TONE_VAR.warning,
    Icon: CircleDashed,
    order: 1,
  },
  adequate: {
    label: "Adequate",
    color: "var(--muted-foreground)",
    bar: "var(--viz-axis)",
    Icon: CircleMinus,
    order: 2,
  },
  strong: {
    label: "Strong",
    color: TONE_VAR.good,
    bar: TONE_VAR.good,
    Icon: CircleCheck,
    order: 3,
  },
};

/** Status with icon + label, never color alone. */
export function StatusPill({ status, className }: { status: BenchmarkStatus; className?: string }) {
  const s = BENCHMARK_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium",
        className
      )}
    >
      <s.Icon className="h-3.5 w-3.5" style={{ color: s.color }} aria-hidden />
      {s.label}
    </span>
  );
}

/** Renders [placeholders] in templates as visible fill-in slots. */
export function Template({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]*\])/).map((part, i) =>
        part.startsWith("[") ? (
          <mark
            key={i}
            className="rounded bg-[var(--viz-series-1-wash)] px-0.5 font-medium text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
