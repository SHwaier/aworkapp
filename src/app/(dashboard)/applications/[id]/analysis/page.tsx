"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleX,
  Copy,
  Info,
  ListChecks,
  Loader2,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  COVERAGE_STATES,
  CoverageBars,
  CoverageLegend,
  Meter,
  PriorityMatrix,
  RankedBars,
  ScoreLineChart,
  TONE_VAR,
  type CoverageRow,
} from "@/components/analysis/charts";
import { copyText, PRIORITY_ORDER, SuggestionCard } from "@/components/analysis/suggestion-card";
import { Notice } from "@/components/analysis/notice";
import { scoreBand, useResumeAnalysis } from "@/components/analysis/use-resume-analysis";
import type { Analysis } from "@/components/analysis/types";
import { scoreOpportunities } from "@/lib/ai/analysis/scoring";
import type { BenchmarkStatus, RequirementCategory } from "@/lib/ai/analysis/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CATEGORY_LABEL: Record<RequirementCategory, string> = {
  skill: "Skills",
  experience: "Experience",
  education: "Education",
  responsibility: "Responsibilities",
  other: "Other",
};

const AREA_LABEL: Record<string, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  keywords: "Keywords",
  formatting: "Formatting",
};

const BENCHMARK_STATUS: Record<
  BenchmarkStatus,
  { label: string; color: string; Icon: typeof CircleCheck }
> = {
  strong: { label: "Strong", color: TONE_VAR.good, Icon: CircleCheck },
  adequate: { label: "Adequate", color: "var(--muted-foreground)", Icon: CircleMinus },
  weak: { label: "Needs work", color: TONE_VAR.warning, Icon: CircleDashed },
  missing: { label: "Missing", color: TONE_VAR.critical, Icon: CircleX },
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "drivers", label: "Score drivers" },
  { id: "plan", label: "Action plan" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "suggestions", label: "Suggestions" },
  { id: "requirements", label: "Requirements" },
  { id: "keywords", label: "Keywords" },
  { id: "formatting", label: "Formatting & writing" },
  { id: "history", label: "History" },
];

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
  const [job, setJob] = useState<{ title: string; company: string } | null>(null);

  useEffect(() => {
    fetch(`/api/applications/${applicationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) return;
        const app = data.data.application;
        setJob({ title: app.jobTitle, company: app.companyId?.name || "" });
      })
      .catch(() => {});
  }, [applicationId]);

  const backHref = `/applications/${applicationId}`;

  return (
    <div className="viz-root mx-auto w-full max-w-6xl space-y-6 pb-16">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to application
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Resume match report</h1>
            <p className="text-sm text-muted-foreground">
              {job ? (
                <>
                  {job.title}
                  {job.company && <> · {job.company}</>}
                </>
              ) : (
                " "
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button onClick={analyze} disabled={!canRun || isStarting} className="gap-1.5">
              {isStarting || inProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {inProgress ? "Analyzing…" : complete ? "Re-analyze" : "Analyze match"}
            </Button>
            {overview && (
              <span className="text-xs text-muted-foreground">
                {overview.quota.limit === null
                  ? "Unlimited analyses"
                  : `${remaining} of ${overview.quota.limit} analyses left today`}
              </span>
            )}
          </div>
        </div>
      </div>

      {loadError && !overview && (
        <Notice icon={<CircleX className="h-4 w-4 text-destructive" />}>
          Couldn&apos;t load the analysis.{" "}
          <button className="font-medium text-primary underline" onClick={reload}>
            Try again
          </button>
        </Notice>
      )}

      {!overview && !loadError && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {overview && (
        <>
          {!overview.ready && (
            <Notice icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
              {overview.reason}{" "}
              <Link href={backHref} className="font-medium text-primary underline">
                Go to the application
              </Link>
            </Notice>
          )}
          {inProgress && (
            <Notice icon={<Loader2 className="h-4 w-4 animate-spin text-primary" />}>
              Analyzing your resume against this job… this usually takes 20–40 seconds. The report
              updates automatically.
            </Notice>
          )}
          {analysis?.status === "failed" && (
            <Notice icon={<CircleX className="h-4 w-4 text-destructive" />}>
              {`${analysis.error || "The analysis failed."} It didn't count against your daily limit.`}
            </Notice>
          )}
          {complete &&
            !overview.upToDate &&
            overview.ready &&
            !inProgress &&
            analysis?.status !== "failed" && (
              <Notice icon={<RotateCcw className="h-4 w-4 text-amber-600" />}>
                Your resume or the job description changed since this report was made. Re-analyze to
                update it.
              </Notice>
            )}
          {!complete && !inProgress && overview.ready && analysis?.status !== "failed" && (
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
                <p className="font-medium">No analysis yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Run an analysis to see how your resume matches this job, where your score comes
                  from, and a step-by-step plan to improve it.
                </p>
              </CardContent>
            </Card>
          )}

          {complete && (
            <div
              className={cn("transition-opacity", inProgress && "pointer-events-none opacity-50")}
              aria-busy={inProgress}
            >
              <Report
                analysis={complete}
                history={overview.history}
                onSuggestionStatus={setSuggestionStatus}
              />
            </div>
          )}
        </>
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
  onSuggestionStatus: Parameters<typeof SuggestionCard>[0]["onStatus"];
}) {
  const score = a.score ?? 0;
  const band = scoreBand(score);
  const insights = a.insights ?? null;
  const [showResolved, setShowResolved] = useState(false);

  const stats = useMemo(() => {
    const required = a.requirements.filter((r) => r.importance === "required");
    const preferred = a.requirements.filter((r) => r.importance === "preferred");
    const count = (list: typeof a.requirements, c: string) =>
      list.filter((r) => r.coverage === c).length;
    return {
      required,
      preferred,
      requiredMet: count(required, "met"),
      preferredMet: count(preferred, "met"),
      keywordsIn: a.keywords.filter((k) => k.inResume).length,
      checksPassed: a.formatChecks.filter((c) => c.status === "pass").length,
      openSuggestions: a.suggestions.filter((s) => s.status === "open").length,
      count,
    };
  }, [a]);

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

  const opportunities = useMemo(() => scoreOpportunities(a.requirements).slice(0, 6), [a]);

  const actionSteps = (insights?.actionPlan ?? []).map((s, i) => ({ ...s, number: i + 1 }));

  const sortedSuggestions = [...a.suggestions].sort(
    (x, y) => PRIORITY_ORDER[x.priority] - PRIORITY_ORDER[y.priority]
  );
  const openSuggestions = sortedSuggestions.filter((s) => s.status === "open");
  const resolvedSuggestions = sortedSuggestions.filter((s) => s.status !== "open");

  const chronological = [...history].reverse().filter((h) => h.score !== null);
  const sameDay =
    chronological.length > 1 &&
    new Date(chronological[0].createdAt).toDateString() ===
      new Date(chronological[chronological.length - 1].createdAt).toDateString();
  const previous = history[1]?.score ?? null;
  const delta = previous !== null ? score - previous : null;

  const missingKeywords = a.keywords
    .filter((k) => !k.inResume)
    .sort((x, y) => (x.importance === y.importance ? 0 : x.importance === "required" ? -1 : 1));
  const presentKeywords = a.keywords.filter((k) => k.inResume);

  return (
    <div className="space-y-6">
      {/* In-page navigation */}
      <nav
        aria-label="Report sections"
        className="sticky top-0 z-10 -mx-1 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur"
      >
        <ul className="flex gap-1 text-sm">
          {SECTIONS.filter((s) => s.id !== "history" || chronological.length > 1).map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block whitespace-nowrap rounded-md px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ─── Overview ─── */}
      <section id="overview" className="scroll-mt-16 space-y-4">
        <Card className="border-border/60">
          <CardContent className="grid gap-8 p-6 md:grid-cols-[14rem_1fr]">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Match score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-semibold leading-none">{score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Meter
                value={score}
                max={100}
                color={TONE_VAR[band.tone]}
                label={`Match score ${score} of 100, ${band.label}`}
              />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{band.label}</span>
                {delta !== null && delta !== 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                    {delta > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {delta > 0 ? "+" : ""}
                    {delta} since last analysis
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-base leading-relaxed">{a.summary}</p>
              {insights?.roleSummary && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">What this role looks for: </span>
                  {insights.roleSummary}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {a.resumeVersionName} · analyzed{" "}
                {formatDistanceToNow(new Date(a.completedAt || a.createdAt), { addSuffix: true })}
                {insights?.seniority && insights.seniority !== "unknown" && (
                  <> · {insights.seniority}-level role</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile
            label="Required met"
            value={`${stats.requiredMet} / ${stats.required.length}`}
            meter={[stats.requiredMet, stats.required.length]}
          />
          <StatTile
            label="Preferred met"
            value={`${stats.preferredMet} / ${stats.preferred.length}`}
            meter={[stats.preferredMet, stats.preferred.length]}
          />
          <StatTile
            label="Keywords matched"
            value={`${stats.keywordsIn} / ${a.keywords.length}`}
            meter={[stats.keywordsIn, a.keywords.length]}
          />
          <StatTile
            label="Formatting & writing"
            value={`${stats.checksPassed} / ${a.formatChecks.length}`}
            meter={[stats.checksPassed, a.formatChecks.length]}
          />
          <StatTile
            label="Open suggestions"
            value={String(stats.openSuggestions)}
            className="col-span-2 lg:col-span-1"
          />
        </div>
      </section>

      {/* ─── Score drivers ─── */}
      <section id="drivers" className="grid scroll-mt-16 gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Requirement coverage</CardTitle>
            <CardDescription>
              How many of the job&apos;s requirements your resume shows, by type. Required ones
              count double toward the score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CoverageLegend />
            <CoverageBars rows={coverageRows} />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Biggest score opportunities</CardTitle>
            <CardDescription>
              Points your score would gain if your resume fully showed each requirement — only where
              it&apos;s true for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {opportunities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Every requirement is already met.
              </p>
            ) : (
              <RankedBars
                valueLabel="points if fully met"
                formatValue={(v) => `+${v}`}
                items={opportunities.map((o) => ({
                  label: o.requirement,
                  value: o.gain,
                  detail: `${o.importance === "required" ? "Required" : "Preferred"} · ${o.coverage}`,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Action plan ─── */}
      <section id="plan" className="scroll-mt-16">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-5 w-5 text-muted-foreground" />
              Action plan
            </CardTitle>
            <CardDescription>
              Steps in order of value. Start with high impact, low effort.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actionSteps.length === 0 ? (
              <InsightsMissing error={a.insightsError} />
            ) : (
              <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
                <ol className="space-y-3">
                  {actionSteps.map((s) => (
                    <li
                      key={s.number}
                      id={`step-${s.number}`}
                      className="flex scroll-mt-24 gap-3 rounded-lg border border-border/60 p-3"
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ background: "var(--viz-series-1)" }}
                      >
                        {s.number}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium">{s.title}</p>
                        <p className="text-sm text-muted-foreground">{s.detail}</p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {s.impact} impact
                          </Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {s.effort} effort
                          </Badge>
                          {s.relatedRequirement && (
                            <span className="text-[11px] text-muted-foreground">
                              For: {s.relatedRequirement}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Impact vs. effort</p>
                  <PriorityMatrix steps={actionSteps} />
                  <p className="text-[11px] text-muted-foreground">
                    Numbers match the steps. The highlighted cell holds the quick wins.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Benchmarks ─── */}
      <section id="benchmarks" className="scroll-mt-16">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              How you compare to typical strong candidates
            </CardTitle>
            <CardDescription className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Based on the AI&apos;s general knowledge of hiring for this kind of role — not other
              members&apos; resumes. Examples are templates: fill in the [brackets] only with
              what&apos;s true for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!insights || insights.benchmarks.length === 0 ? (
              <InsightsMissing error={a.insightsError} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {insights.benchmarks.map((b, i) => {
                  const status = BENCHMARK_STATUS[b.yourStatus];
                  return (
                    <div key={i} className="space-y-3 rounded-lg border border-border/60 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {b.title.toLowerCase() !==
                            (AREA_LABEL[b.area] ?? b.area).toLowerCase() && (
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {AREA_LABEL[b.area] ?? b.area}
                            </p>
                          )}
                          <p className="font-medium">{b.title}</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                          <status.Icon
                            className="h-3.5 w-3.5"
                            style={{ color: status.color }}
                            aria-hidden
                          />
                          {status.label}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Typical for this role
                        </p>
                        <p className="text-sm">{b.typical}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Your resume</p>
                        <p className="text-sm">{b.gap}</p>
                      </div>
                      {b.examples.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Example templates
                          </p>
                          {b.examples.map((ex, j) => (
                            <div
                              key={j}
                              className="relative rounded-md bg-muted/40 px-3 py-2 pr-9 text-sm"
                            >
                              <Highlighted text={ex} />
                              <button
                                className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => copyText(ex)}
                                aria-label="Copy example"
                                title="Copy"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Suggestions ─── */}
      <section id="suggestions" className="scroll-mt-16">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Suggested edits ({openSuggestions.length})</CardTitle>
            <CardDescription>
              Specific changes to your resume. Mark them done as you go, then upload the new version
              and re-analyze to see your score change.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {openSuggestions.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {resolvedSuggestions.length > 0
                  ? "You've worked through every suggestion. Upload your updated resume and re-analyze."
                  : "No suggestions — this resume already covers the job well."}
              </p>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              {openSuggestions.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} onStatus={onSuggestionStatus} />
              ))}
            </div>
            {resolvedSuggestions.length > 0 && (
              <div>
                <button
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setShowResolved((v) => !v)}
                >
                  {showResolved ? "Hide" : "Show"} done & dismissed ({resolvedSuggestions.length})
                </button>
                {showResolved && (
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {resolvedSuggestions.map((s) => (
                      <SuggestionCard key={s.id} suggestion={s} onStatus={onSuggestionStatus} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Requirements (also the table view for the coverage chart) ─── */}
      <section id="requirements" className="scroll-mt-16">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Requirements</CardTitle>
            <CardDescription>
              Each requirement from the job and the line in your resume that supports it. Evidence
              is checked against your resume; unverifiable claims are lowered.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Requirement</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Evidence in your resume</th>
                </tr>
              </thead>
              <tbody>
                {a.requirements.map((r, i) => {
                  const state = COVERAGE_STATES.find((c) => c.key === r.coverage)!;
                  return (
                    <tr key={i} className="border-b border-border/50 align-top last:border-0">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{r.text}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.note}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        {r.importance === "required" ? "Required" : "Preferred"}
                        {r.category && <> · {CATEGORY_LABEL[r.category]}</>}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <state.Icon
                            className="h-4 w-4"
                            style={{ color: TONE_VAR[state.tone] }}
                            aria-hidden
                          />
                          {state.label}
                        </span>
                        {r.claimedCoverage !== r.coverage && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Lowered: evidence not found
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-xs italic text-muted-foreground">
                        {r.evidence ? <>&ldquo;{r.evidence}&rdquo;</> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* ─── Keywords + formatting ─── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section id="keywords" className="scroll-mt-16">
          <Card className="h-full border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Keywords</CardTitle>
              <CardDescription>
                Terms applicant tracking systems are likely to match from this job. Matching is
                checked against your resume&apos;s text.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {presentKeywords.length} of {a.keywords.length} in your resume
                  </span>
                  <span>
                    {a.keywords.length
                      ? Math.round((presentKeywords.length / a.keywords.length) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <Meter
                  value={presentKeywords.length}
                  max={a.keywords.length}
                  label={`${presentKeywords.length} of ${a.keywords.length} keywords in your resume`}
                />
              </div>
              {missingKeywords.length > 0 && (
                <KeywordGroup
                  title="Missing — add only if true for you"
                  keywords={missingKeywords}
                  present={false}
                />
              )}
              {presentKeywords.length > 0 && (
                <KeywordGroup title="Already in your resume" keywords={presentKeywords} present />
              )}
            </CardContent>
          </Card>
        </section>

        <section id="formatting" className="scroll-mt-16">
          <Card className="h-full border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Formatting &amp; writing</CardTitle>
              <CardDescription>
                Checks that help applicant tracking systems parse your resume and help it read as
                specific, results-led, and written by you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/50">
                {a.formatChecks.map((c) => (
                  <li key={c.id} className="flex gap-3 py-2.5">
                    {c.status === "pass" ? (
                      <CircleCheck
                        className="h-4 w-4 shrink-0"
                        style={{ color: TONE_VAR.good }}
                        aria-label="Pass"
                      />
                    ) : (
                      <AlertTriangle
                        className="h-4 w-4 shrink-0"
                        style={{ color: TONE_VAR.warning }}
                        aria-label="Needs attention"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ─── History ─── */}
      {chronological.length > 1 && (
        <section id="history" className="scroll-mt-16">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Score history</CardTitle>
              <CardDescription>
                Match score for each resume version you analyzed for this job.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[1fr_18rem]">
              <ScoreLineChart
                points={chronological.map((h) => ({
                  label: format(new Date(h.createdAt), sameDay ? "h:mm a" : "MMM d"),
                  value: h.score!,
                  detail: `${h.resumeVersionName} · ${format(new Date(h.createdAt), "MMM d, h:mm a")}`,
                }))}
              />
              <table className="w-full self-start text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-1.5 font-medium">Version</th>
                    <th className="py-1.5 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-2">
                        <p className="truncate">{h.resumeVersionName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(h.createdAt), "MMM d, h:mm a")}
                        </p>
                      </td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">{h.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  meter,
  className,
}: {
  label: string;
  value: string;
  meter?: [number, number];
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 rounded-xl border border-border/60 bg-card p-4", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold leading-none">{value}</p>
      {meter && <Meter value={meter[0]} max={meter[1]} label={`${label}: ${value}`} />}
    </div>
  );
}

function KeywordGroup({
  title,
  keywords,
  present,
}: {
  title: string;
  keywords: { term: string; importance: string }[];
  present: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((k) => (
          <span
            key={k.term}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs"
          >
            {present ? (
              <CircleCheck className="h-3 w-3" style={{ color: TONE_VAR.good }} aria-hidden />
            ) : (
              <CircleX className="h-3 w-3" style={{ color: TONE_VAR.critical }} aria-hidden />
            )}
            {k.term}
            {!present && k.importance === "required" && (
              <span className="text-[10px] text-muted-foreground">· required</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Renders [placeholders] in example templates as visible fill-in slots. */
function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]*\])/).map((part, i) =>
        part.startsWith("[") ? (
          <span
            key={i}
            className="rounded bg-[var(--viz-series-1-wash)] px-0.5 font-medium text-foreground"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function InsightsMissing({ error }: { error?: string | null }) {
  return (
    <p className="py-4 text-center text-sm text-muted-foreground">
      {error
        ? `${error} Re-analyze to try again.`
        : "This analysis was made before benchmarks and action plans existed. Re-analyze to get them."}
    </p>
  );
}
