"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CircleX,
  Loader2,
  RotateCcw,
  FileSearch,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter, TONE_VAR } from "@/components/analysis/charts";
import { PRIORITY_ORDER } from "@/components/analysis/utils";
import { Notice } from "@/components/analysis/notice";
import { scoreBand, useResumeAnalysis } from "@/components/analysis/use-resume-analysis";

/** Compact summary on the application's Resume tab; the full report has its own page. */
export function ResumeAnalysisPanel({ applicationId }: { applicationId: string }) {
  const {
    overview,
    analysis,
    complete,
    inProgress,
    outdatedRun,
    remaining,
    canRun,
    loadError,
    isStarting,
    analyze,
    reload,
  } = useResumeAnalysis(applicationId);

  if (loadError && !overview) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load the resume analysis.{" "}
          <button className="font-medium text-primary underline" onClick={reload}>
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!overview) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { quota } = overview;
  const reportHref = `/applications/${applicationId}/analysis`;
  const band = complete ? scoreBand(complete.score!) : null;
  const previousScore = overview.history[1]?.score ?? null;
  const delta = complete && previousScore !== null ? complete.score! - previousScore : null;

  const required = complete?.requirements.filter((r) => r.importance === "required") ?? [];
  const requiredMet = required.filter((r) => r.coverage === "met").length;
  const keywordsIn = complete?.keywords.filter((k) => k.inResume).length ?? 0;
  const topSteps = (complete?.suggestions ?? [])
    .filter((s) => s.status === "open")
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 3);

  return (
    <Card className="viz-root border-border/60">
      <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">Resume match</CardTitle>
          <p className="text-xs text-muted-foreground">
            {quota.limit === null
              ? "Unlimited analyses"
              : `${remaining} of ${quota.limit} analyses left today`}
          </p>
        </div>
        <div className="flex gap-2">
          {complete && (
            <Link
              href={reportHref}
              className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
            >
              Full report
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <Button
            size="sm"
            onClick={analyze}
            disabled={!canRun || isStarting}
            className="gap-1.5"
            id="analyze-resume"
          >
            {isStarting || (inProgress && !outdatedRun) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSearch className="h-4 w-4" />
            )}
            {outdatedRun
              ? "Analyze current version"
              : inProgress
                ? "Analyzing…"
                : complete
                  ? "Re-analyze"
                  : "Analyze match"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 border-t border-border/40 pt-5">
        {!overview.ready && (
          <Notice icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
            {overview.reason}
          </Notice>
        )}
        {overview.ready && remaining === 0 && !inProgress && (
          <Notice icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
            {quota.limit === 0
              ? "AI analysis is turned off for your account. Contact an admin."
              : `You've used all of today's analyses. More are available ${formatDistanceToNow(new Date(quota.resetsAt), { addSuffix: true })}.`}
          </Notice>
        )}
        {inProgress && !outdatedRun && (
          <Notice icon={<Loader2 className="h-4 w-4 animate-spin text-primary" />}>
            Analyzing your resume against this job… this usually takes 20–40 seconds.
          </Notice>
        )}
        {outdatedRun && (
          <Notice icon={<RotateCcw className="h-4 w-4 text-amber-600" />}>
            Your resume or the job changed while this analysis was running. It will still finish and
            counts toward today&apos;s limit, but it reflects the earlier version. Analyze again to
            check the current one.
          </Notice>
        )}
        {analysis?.status === "failed" && (
          <Notice icon={<CircleX className="h-4 w-4 text-destructive" />}>
            {`${analysis.error || "The analysis failed."} It didn't count against your daily limit.`}
          </Notice>
        )}
        {!complete && !inProgress && overview.ready && analysis?.status !== "failed" && (
          <p className="text-sm text-muted-foreground">
            See how well this resume matches the job — which requirements it covers, missing
            keywords, how it compares to typical strong candidates, and a step-by-step plan to
            improve it.
          </p>
        )}

        {complete && band && (
          <>
            {complete.usedFallback && !inProgress ? (
              <Notice icon={<RotateCcw className="h-4 w-4 text-amber-600" />}>
                The main AI model was busy, so a backup model made this analysis. Re-analyze later
                for the full-quality result.
              </Notice>
            ) : (
              !overview.upToDate &&
              overview.ready &&
              !inProgress && (
                <Notice icon={<RotateCcw className="h-4 w-4 text-amber-600" />}>
                  Your resume or the job description changed since this analysis. Re-analyze to
                  update it.
                </Notice>
              )
            )}
            {complete.reused && (
              <p className="text-xs text-muted-foreground">
                This resume was already analyzed against this job, so the earlier result was reused.
                It didn&apos;t use any of today&apos;s analyses.
              </p>
            )}

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="w-full shrink-0 space-y-2 sm:w-44">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-5xl font-semibold leading-none">{complete.score}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <Meter
                  value={complete.score!}
                  max={100}
                  color={TONE_VAR[band.tone]}
                  label={`Match score ${complete.score} of 100`}
                />
                <div className="flex flex-wrap items-center gap-x-2 text-xs">
                  <span className="font-medium">{band.label}</span>
                  {delta !== null && delta !== 0 && (
                    <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                      {delta > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {delta > 0 ? "+" : ""}
                      {delta} vs last
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-sm leading-relaxed">{complete.summary}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">
                      {requiredMet}/{required.length}
                    </span>{" "}
                    required met
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {keywordsIn}/{complete.keywords.length}
                    </span>{" "}
                    keywords
                  </span>
                  <span>
                    {complete.resumeVersionName} ·{" "}
                    {formatDistanceToNow(new Date(complete.completedAt || complete.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {topSteps.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Top next steps</p>
                <ol className="space-y-1.5">
                  {topSteps.map((s, i) => (
                    <li key={s.id} className="flex gap-2 text-sm">
                      <span className="w-4 shrink-0 tabular-nums text-muted-foreground">
                        {i + 1}.
                      </span>
                      <span className="min-w-0">{s.title}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={reportHref}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  See the full report with charts, benchmarks, and every suggestion
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
