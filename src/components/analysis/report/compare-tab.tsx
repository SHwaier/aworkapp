"use client";

import { Copy, Info } from "lucide-react";
import type { Benchmark, BenchmarkStatus } from "@/lib/ai/analysis/types";
import { copyText } from "../suggestion-card";
import { Disclosure } from "./disclosure";
import { BENCHMARK_STATUS, StatusPill, Template } from "./status";

const AREA_LABEL: Record<string, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  keywords: "Keywords",
  formatting: "Formatting",
};

export function CompareTab({
  benchmarks,
  roleSummary,
  insightsNote,
}: {
  benchmarks: Benchmark[];
  roleSummary: string | null;
  insightsNote: string | null;
}) {
  if (benchmarks.length === 0) {
    return <p className="text-sm text-muted-foreground">{insightsNote}</p>;
  }

  // Weakest areas first
  const sorted = [...benchmarks].sort(
    (a, b) => BENCHMARK_STATUS[a.yourStatus].order - BENCHMARK_STATUS[b.yourStatus].order
  );
  const firstToOpen = sorted.findIndex((b) => b.yourStatus !== "strong");
  const counts = (Object.keys(BENCHMARK_STATUS) as BenchmarkStatus[])
    .map((status) => ({ status, count: benchmarks.filter((b) => b.yourStatus === status).length }))
    .filter((c) => c.count > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {roleSummary && <p className="max-w-3xl text-[15px] leading-relaxed">{roleSummary}</p>}

        {/* Status breakdown: one stacked strip + counts as the legend */}
        <div className="space-y-2">
          <div
            className="flex h-2 gap-[2px] overflow-hidden rounded-full"
            role="img"
            aria-label={counts
              .map((c) => `${c.count} ${BENCHMARK_STATUS[c.status].label.toLowerCase()}`)
              .join(", ")}
          >
            {counts.map((c) => (
              <div
                key={c.status}
                style={{
                  flexGrow: c.count,
                  flexBasis: 0,
                  background: BENCHMARK_STATUS[c.status].color,
                }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {counts.map((c) => {
              const s = BENCHMARK_STATUS[c.status];
              return (
                <span key={c.status} className="inline-flex items-center gap-1.5">
                  <s.Icon className="h-4 w-4" style={{ color: s.color }} aria-hidden />
                  {c.count} {s.label.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          From the AI&apos;s general knowledge of hiring for this kind of role, not other
          members&apos; resumes.
        </p>
      </div>

      <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
        {sorted.map((b, i) => {
          const area = AREA_LABEL[b.area] ?? b.area;
          const title = b.title.toLowerCase() === area.toLowerCase() ? area : b.title;
          return (
            <li key={i}>
              <Disclosure
                defaultOpen={i === firstToOpen}
                summaryClassName="p-4"
                summary={
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={b.yourStatus} />
                      <span className="font-medium">{title}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground group-open:hidden">
                      {b.gap}
                    </p>
                  </div>
                }
              >
                <div className="space-y-5 px-4 pb-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Strong candidates usually
                      </p>
                      <p className="text-sm leading-relaxed">{b.typical}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Your resume</p>
                      <p className="text-sm leading-relaxed">{b.gap}</p>
                    </div>
                  </div>
                  {b.examples.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Templates. Fill in the highlighted parts only with what&apos;s true for you.
                      </p>
                      {b.examples.map((ex, j) => (
                        <div
                          key={j}
                          className="flex items-start gap-2 rounded-lg border border-border/70 px-3 py-2"
                        >
                          <p className="min-w-0 flex-1 text-sm leading-relaxed">
                            <Template text={ex} />
                          </p>
                          <button
                            type="button"
                            onClick={() => copyText(ex)}
                            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Copy template"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Disclosure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
