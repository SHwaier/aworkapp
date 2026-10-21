"use client";

import { format } from "date-fns";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  CoverageBars,
  CoverageLegend,
  RankedBars,
  ScoreLineChart,
  type CoverageRow,
} from "../charts";
import type { ScoreOpportunity } from "@/lib/ai/analysis/scoring";
import type { HistoryPoint } from "../types";
import { Disclosure } from "./disclosure";

export interface NextStep {
  title: string;
  detail?: string;
}

/** A titled block without card chrome; the page's cards are reserved for the hero. */
export function Panel({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function OverviewTab({
  opportunities,
  coverageRows,
  nextSteps,
  history,
  onOpenFix,
}: {
  opportunities: ScoreOpportunity[];
  coverageRows: CoverageRow[];
  nextSteps: NextStep[];
  history: HistoryPoint[];
  onOpenFix: () => void;
}) {
  const chronological = [...history].reverse().filter((h) => h.score !== null);
  const sameDay =
    chronological.length > 1 &&
    new Date(chronological[0].createdAt).toDateString() ===
      new Date(chronological[chronological.length - 1].createdAt).toDateString();

  return (
    <div className="space-y-10">
      {nextSteps.length > 0 && (
        <Panel title="Start here">
          <ol className="divide-y divide-border/60 rounded-xl border border-border/70">
            {nextSteps.map((step, i) => (
              <li key={i} className="flex gap-3 p-4">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: "var(--viz-series-1)" }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{step.title}</p>
                  {step.detail && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {step.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <Button variant="outline" size="sm" className="mt-3" onClick={onOpenFix}>
            See every step and edit
          </Button>
        </Panel>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <Panel
          title="Where you lose points"
          hint="Points gained if your resume fully showed each one"
        >
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You aren&apos;t losing points on any requirement.
            </p>
          ) : (
            <RankedBars
              valueLabel="points if fully shown"
              formatValue={(v) => `+${v}`}
              items={opportunities.map((o) => ({
                label: o.requirement,
                value: o.gain,
                detail: o.importance === "required" ? "Required" : "Preferred",
              }))}
            />
          )}
        </Panel>

        <Panel title="Coverage by type" hint="Job requirements your resume shows">
          <div className="space-y-4">
            <CoverageLegend />
            <CoverageBars rows={coverageRows} />
          </div>
        </Panel>
      </div>

      {chronological.length > 1 && (
        <Panel title="Progress" hint="Score for each resume version you analyzed for this job">
          <ScoreLineChart
            points={chronological.map((h) => ({
              label: format(new Date(h.createdAt), sameDay ? "h:mm a" : "MMM d"),
              value: h.score!,
              detail: `${h.resumeVersionName}, ${format(new Date(h.createdAt), "MMM d, h:mm a")}`,
            }))}
          />
          <Disclosure
            className="mt-3"
            summaryClassName="text-sm font-medium text-muted-foreground hover:text-foreground"
            summary="Show as a table"
          >
            <table className="mt-2 w-full max-w-md text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 font-medium">Version</th>
                  <th className="py-1.5 font-medium">Analyzed</th>
                  <th className="py-1.5 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-2">{h.resumeVersionName}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {format(new Date(h.createdAt), "MMM d, h:mm a")}
                    </td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{h.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>
        </Panel>
      )}
    </div>
  );
}
