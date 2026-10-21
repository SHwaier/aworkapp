"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CircleCheck, CircleDashed, CircleX, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_VAR } from "../charts";
import { scoreBand } from "../use-resume-analysis";
import type { Analysis } from "../types";

const BAND_ICON = { good: CircleCheck, warning: CircleDashed, critical: CircleX };

/**
 * The page's one bold element: the score and a match bar showing where the
 * resume is now and the score it could reach by fixing its biggest gaps.
 */
export function ReportHero({
  analysis: a,
  potential,
  gapsToFix,
  delta,
}: {
  analysis: Analysis;
  /** Score if the top `gapsToFix` opportunities were met */
  potential: number;
  gapsToFix: number;
  delta: number | null;
}) {
  const score = a.score ?? 0;
  const band = scoreBand(score);
  const BandIcon = BAND_ICON[band.tone];
  const gain = potential - score;
  const [expanded, setExpanded] = useState(false);

  const required = a.requirements.filter((r) => r.importance === "required");
  const stats = [
    {
      value: `${required.filter((r) => r.coverage === "met").length}/${required.length}`,
      label: "required skills and experience shown",
    },
    {
      value: `${a.keywords.filter((k) => k.inResume).length}/${a.keywords.length}`,
      label: "job keywords in your resume",
    },
    {
      value: `${a.formatChecks.filter((c) => c.status === "pass").length}/${a.formatChecks.length}`,
      label: "formatting and writing checks passed",
    },
  ];

  return (
    <section
      aria-labelledby="match-score"
      className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
        {/* Score */}
        <div className="shrink-0">
          <h2 id="match-score" className="text-sm text-muted-foreground">
            Match score
          </h2>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-6xl font-semibold leading-none tracking-tight">{score}</span>
            <span className="text-lg text-muted-foreground">/100</span>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <BandIcon className="h-4 w-4" style={{ color: TONE_VAR[band.tone] }} aria-hidden />
              {band.label}
            </span>
            {delta !== null && delta !== 0 && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                {delta > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {delta > 0 ? `Up ${delta}` : `Down ${-delta}`} from last version
              </span>
            )}
          </p>
        </div>

        {/* Match bar: now vs. reachable */}
        <div className="min-w-0 flex-1 space-y-3">
          {gain > 0 ? (
            <p className="text-base">
              Fix your top {gapsToFix === 1 ? "gap" : `${gapsToFix} gaps`} to reach about{" "}
              <span className="font-semibold">{potential}</span>.
            </p>
          ) : (
            <p className="text-base">Your resume shows every requirement in this job.</p>
          )}
          <div
            className="relative h-3 w-full rounded-full bg-[var(--viz-track)]"
            role="img"
            aria-label={`Current score ${score} of 100${gain > 0 ? `; about ${potential} after fixing the top gaps` : ""}`}
          >
            {gain > 0 && (
              <div
                className="absolute inset-y-0 left-0 rounded-full opacity-35"
                style={{ width: `${potential}%`, background: TONE_VAR[scoreBand(potential).tone] }}
              />
            )}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${score}%`, background: TONE_VAR[band.tone] }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Now {score}</span>
            {gain > 0 && <span>Reachable {potential}</span>}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 max-w-3xl">
        <p className={cn("text-[15px] leading-relaxed", !expanded && "line-clamp-2")}>
          {a.summary}
        </p>
        {a.summary.length > 160 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-sm font-medium text-primary hover:underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Key counts */}
      <ul className="mt-6 grid gap-4 border-t border-border/60 pt-5 sm:grid-cols-3">
        {stats.map((s) => (
          <li key={s.label} className="flex items-baseline gap-2 sm:block">
            <span className="text-2xl font-semibold">{s.value}</span>
            <span className="block text-sm text-muted-foreground">{s.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs text-muted-foreground">
        Analyzed {formatDistanceToNow(new Date(a.completedAt || a.createdAt), { addSuffix: true })}{" "}
        for {a.resumeVersionName}
      </p>
    </section>
  );
}
