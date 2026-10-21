"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CircleX, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CoverageRow } from "@/components/analysis/charts";
import { Notice } from "@/components/analysis/notice";
import { PRIORITY_ORDER } from "@/components/analysis/utils";
import { useResumeAnalysis } from "@/components/analysis/use-resume-analysis";
import type { Analysis } from "@/components/analysis/types";
import { ReportHero } from "@/components/analysis/report/report-hero";
import { OverviewTab, type NextStep } from "@/components/analysis/report/overview-tab";
import { FixTab } from "@/components/analysis/report/fix-tab";
import { CompareTab } from "@/components/analysis/report/compare-tab";
import { DetailsTab } from "@/components/analysis/report/details-tab";
import { ExportMenu } from "@/components/analysis/report/export-menu";
import { potentialScore, scoreOpportunities } from "@/lib/ai/analysis/scoring";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CATEGORY_LABEL: Record<string, string> = {
  skill: "Skills",
  experience: "Experience",
  education: "Education",
  responsibility: "Responsibilities",
  other: "Other",
};

/** How many of the biggest gaps the hero's "reachable" score assumes you fix. */
const GAPS_TO_FIX = 3;

export default function AnalysisReportPage({ params }: RouteParams) {
  const { id: applicationId } = use(params);
  const {
    overview,
    analysis,
    complete,
    inProgress,
    remaining,
    canRun,
    loadError,
    isStarting,
    analyze,
    reload,
    setSuggestionStatus,
  } = useResumeAnalysis(applicationId);
  const [job, setJob] = useState<{ title: string; company: string; description: string } | null>(
    null
  );

  useEffect(() => {
    fetch(`/api/applications/${applicationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) return;
        const app = data.data.application;
        setJob({
          title: app.jobTitle,
          company: app.companyId?.name || "",
          description: app.jobDescription || "",
        });
      })
      .catch(() => {});
  }, [applicationId]);

  const backHref = `/applications/${applicationId}`;

  return (
    <div className="viz-root mx-auto w-full max-w-5xl pb-20">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to application
      </Link>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Resume match</h1>
          <p className="mt-1 truncate text-muted-foreground">
            {job ? (job.company ? `${job.title} at ${job.company}` : job.title) : " "}
          </p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {complete && job && (
              <ExportMenu analysis={complete} job={job} applicationId={applicationId} />
            )}
            <Button
              onClick={analyze}
              disabled={!canRun || isStarting}
              className="w-full gap-1.5 sm:w-auto"
            >
              {isStarting || inProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {inProgress ? "Analyzing" : complete ? "Re-analyze" : "Analyze match"}
            </Button>
          </div>
          {overview && (
            <span className="text-xs text-muted-foreground">
              {overview.quota.limit === null
                ? "No daily limit"
                : `${remaining} of ${overview.quota.limit} left today`}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loadError && !overview && (
          <Notice icon={<CircleX className="h-4 w-4 text-destructive" />}>
            The report didn&apos;t load.{" "}
            <button className="font-medium text-primary underline" onClick={reload}>
              Try again
            </button>
          </Notice>
        )}
        {overview && !overview.ready && (
          <Notice icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
            {overview.reason}{" "}
            <Link href={backHref} className="font-medium text-primary underline">
              Open the application
            </Link>
          </Notice>
        )}
        {inProgress && (
          <Notice icon={<Loader2 className="h-4 w-4 animate-spin text-primary" />}>
            {
              "Analyzing your resume against this job. This usually takes 20 to 40 seconds and the report updates on its own."
            }
          </Notice>
        )}
        {analysis?.status === "failed" && (
          <Notice icon={<CircleX className="h-4 w-4 text-destructive" />}>
            {`${analysis.error || "The analysis failed."} It didn't count against your daily limit.`}
          </Notice>
        )}
        {complete &&
          overview &&
          !overview.upToDate &&
          overview.ready &&
          !inProgress &&
          analysis?.status !== "failed" && (
            <Notice icon={<RotateCcw className="h-4 w-4 text-amber-600" />}>
              {
                "Your resume or the job description changed since this report. Re-analyze to update it."
              }
            </Notice>
          )}
      </div>

      {!overview && !loadError && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {overview && !complete && !inProgress && overview.ready && analysis?.status !== "failed" && (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-7 w-7 text-primary" />
          <p className="font-medium">No analysis yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Analyze your resume to see how well it matches this job and what to change first.
          </p>
        </div>
      )}

      {complete && overview && (
        <div
          className={cn("mt-6 transition-opacity", inProgress && "pointer-events-none opacity-50")}
          aria-busy={inProgress}
        >
          <Report
            analysis={complete}
            history={overview.history}
            onSuggestionStatus={setSuggestionStatus}
          />
        </div>
      )}
    </div>
  );
}

function Report({
  analysis: a,
  history,
  onSuggestionStatus,
}: {
  analysis: Analysis;
  history: { id: string; score: number | null; resumeVersionName: string; createdAt: string }[];
  onSuggestionStatus: Parameters<typeof FixTab>[0]["onSuggestionStatus"];
}) {
  const [tab, setTab] = useState("overview");
  const insights = a.insights ?? null;
  const insightsNote = a.insightsError
    ? `${a.insightsError} Re-analyze to try again.`
    : "Re-analyze to get a step-by-step plan and role benchmarks for this report.";

  const allOpportunities = useMemo(() => scoreOpportunities(a.requirements), [a]);
  const potential = useMemo(() => potentialScore(a.requirements, GAPS_TO_FIX), [a]);
  const gapsToFix = Math.min(GAPS_TO_FIX, allOpportunities.length);

  const coverageRows: CoverageRow[] = useMemo(() => {
    const hasCategories = a.requirements.some((r) => r.category);
    const groups = new Map<string, typeof a.requirements>();
    for (const r of a.requirements) {
      const key = hasCategories
        ? CATEGORY_LABEL[r.category ?? "other"]
        : r.importance === "required"
          ? "Required"
          : "Preferred";
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    return [...groups.entries()]
      .map(([label, list]) => ({
        label,
        met: list.filter((r) => r.coverage === "met").length,
        partial: list.filter((r) => r.coverage === "partial").length,
        missing: list.filter((r) => r.coverage === "missing").length,
      }))
      .sort((x, y) => y.met + y.partial + y.missing - (x.met + x.partial + x.missing));
  }, [a]);

  const openEdits = a.suggestions.filter((s) => s.status === "open");
  const nextSteps: NextStep[] = insights?.actionPlan.length
    ? insights.actionPlan.slice(0, 3).map((s) => ({ title: s.title, detail: s.detail }))
    : [...openEdits]
        .sort((x, y) => PRIORITY_ORDER[x.priority] - PRIORITY_ORDER[y.priority])
        .slice(0, 3)
        .map((s) => ({ title: s.title }));

  const previous = history[1]?.score ?? null;
  const delta = previous !== null && a.score !== null ? a.score - previous : null;

  const switchTab = (value: string) => {
    setTab(value);
    document.getElementById("report-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-8">
      <ReportHero analysis={a} potential={potential} gapsToFix={gapsToFix} delta={delta} />

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="gap-0">
        <div
          id="report-tabs"
          className="sticky top-0 z-10 -mx-4 border-b border-border/70 bg-background/95 px-4 backdrop-blur sm:mx-0 sm:px-0"
        >
          <TabsList variant="line" className="h-11 w-full justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="overview" className="flex-none px-3">
              Overview
            </TabsTrigger>
            <TabsTrigger value="fix" className="flex-none px-3">
              Fix
              {openEdits.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                  {openEdits.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex-none px-3">
              Compare
            </TabsTrigger>
            <TabsTrigger value="details" className="flex-none px-3">
              Details
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="pt-8">
          <OverviewTab
            opportunities={allOpportunities.slice(0, 6)}
            coverageRows={coverageRows}
            nextSteps={nextSteps}
            history={history}
            onOpenFix={() => switchTab("fix")}
          />
        </TabsContent>
        <TabsContent value="fix" className="pt-8">
          <FixTab
            steps={insights?.actionPlan ?? []}
            suggestions={a.suggestions}
            onSuggestionStatus={onSuggestionStatus}
            insightsNote={insightsNote}
          />
        </TabsContent>
        <TabsContent value="compare" className="pt-8">
          <CompareTab
            benchmarks={insights?.benchmarks ?? []}
            roleSummary={insights?.roleSummary ?? null}
            insightsNote={insightsNote}
          />
        </TabsContent>
        <TabsContent value="details" className="pt-8">
          <DetailsTab analysis={a} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
