"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CircleCheck,
  CircleDashed,
  CircleX,
  Copy,
  Loader2,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ─── API shapes (GET /api/applications/:id/analysis) ───

type Coverage = "met" | "partial" | "missing";
type SuggestionStatus = "open" | "done" | "dismissed";

interface Requirement {
  text: string;
  importance: "required" | "preferred";
  coverage: Coverage;
  claimedCoverage: Coverage;
  evidence: string;
  evidenceVerified: boolean;
  note: string;
}

interface Suggestion {
  id: string;
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  original: string;
  suggestedText: string;
  rationale: string;
  requiresVerification: boolean;
  status: SuggestionStatus;
}

interface Analysis {
  id: string;
  status: "queued" | "running" | "complete" | "failed";
  error: string | null;
  score: number | null;
  summary: string;
  resumeVersionName: string;
  requirements: Requirement[];
  keywords: { term: string; importance: "required" | "preferred"; inResume: boolean }[];
  suggestions: Suggestion[];
  formatChecks: { id: string; label: string; status: "pass" | "warn"; detail: string }[];
  completedAt: string | null;
  createdAt: string;
}

interface Overview {
  analysis: Analysis | null;
  history: { id: string; score: number | null; resumeVersionName: string; createdAt: string }[];
  ready: boolean;
  reason: string | null;
  upToDate: boolean;
  quota: { used: number; limit: number | null; resetsAt: string };
}

const POLL_MS = 2500;

const SUGGESTION_TYPE_LABEL: Record<string, string> = {
  rewrite_bullet: "Rewrite bullet",
  add_keyword: "Add keyword",
  add_content: "Add content",
  remove_content: "Remove",
  reorder: "Reorder",
  wording: "Wording",
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

function scoreTone(score: number) {
  if (score >= 75)
    return {
      ring: "stroke-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      label: "Strong match",
    };
  if (score >= 50)
    return {
      ring: "stroke-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      label: "Partial match",
    };
  return { ring: "stroke-red-500", text: "text-red-600 dark:text-red-400", label: "Weak match" };
}

function ScoreRing({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);
  return (
    <div
      className="relative h-24 w-24 shrink-0"
      role="img"
      aria-label={`Match score ${score} out of 100`}
    >
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={radius} className="fill-none stroke-muted" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className={cn("fill-none transition-[stroke-dashoffset] duration-700", tone.ring)}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-bold tabular-nums", tone.text)}>{score}</span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function CoverageIcon({ coverage }: { coverage: Coverage }) {
  if (coverage === "met")
    return <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Met" />;
  if (coverage === "partial")
    return <CircleDashed className="h-4 w-4 shrink-0 text-amber-500" aria-label="Partially met" />;
  return <CircleX className="h-4 w-4 shrink-0 text-red-500" aria-label="Missing" />;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}

export function ResumeAnalysisPanel({ applicationId }: { applicationId: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const analysis = overview?.analysis ?? null;
  const inProgress = analysis?.status === "queued" || analysis?.status === "running";

  // Load the overview; keep polling while a run is in progress
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = () =>
      fetch(`/api/applications/${applicationId}/analysis`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (!data.success) throw new Error(data.error);
          setOverview(data.data);
          setLoadError(false);
          const status = data.data.analysis?.status;
          if (status === "queued" || status === "running") {
            timer = setTimeout(load, POLL_MS);
          }
        })
        .catch(() => {
          if (!cancelled) setLoadError(true);
        });

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [applicationId, refreshKey]);

  async function handleAnalyze() {
    setIsStarting(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/analysis`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start the analysis");
      if (!data.data.started) toast.info("Nothing changed since the last analysis");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start the analysis");
    } finally {
      setIsStarting(false);
    }
  }

  async function setSuggestionStatus(suggestion: Suggestion, status: SuggestionStatus) {
    const previous = overview;
    // Optimistic update
    setOverview((o) =>
      o?.analysis
        ? {
            ...o,
            analysis: {
              ...o.analysis,
              suggestions: o.analysis.suggestions.map((s) =>
                s.id === suggestion.id ? { ...s, status } : s
              ),
            },
          }
        : o
    );
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/analysis/suggestions/${suggestion.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) throw new Error();
    } catch {
      setOverview(previous);
      toast.error("Couldn't update the suggestion");
    }
  }

  if (loadError && !overview) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load the resume analysis.{" "}
          <button
            className="font-medium text-primary underline"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
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
  const remaining = quota.limit === null ? null : Math.max(0, quota.limit - quota.used);
  const complete = analysis?.status === "complete" ? analysis : null;
  const canRun = overview.ready && !inProgress && (remaining === null || remaining > 0);

  const analyzeButton = (
    <Button
      size="sm"
      onClick={handleAnalyze}
      disabled={!canRun || isStarting || (overview.upToDate && !!complete)}
      className="gap-1.5"
      id="analyze-resume"
    >
      {isStarting || inProgress ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {inProgress ? "Analyzing…" : complete ? "Re-analyze" : "Analyze match"}
    </Button>
  );

  const quotaText =
    quota.limit === null
      ? "Unlimited analyses"
      : `${remaining} of ${quota.limit} analyses left today`;

  const openSuggestions = (complete?.suggestions ?? [])
    .filter((s) => s.status === "open")
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const resolvedSuggestions = (complete?.suggestions ?? []).filter((s) => s.status !== "open");

  const previousScore = overview.history[1]?.score ?? null;
  const delta =
    complete?.score != null && previousScore != null ? complete.score - previousScore : null;

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" />
            Resume match
          </CardTitle>
          <p className="text-xs text-muted-foreground">{quotaText}</p>
        </div>
        {analyzeButton}
      </CardHeader>

      <CardContent className="space-y-5 border-t border-border/40 pt-5">
        {/* Can't run yet */}
        {!overview.ready && (
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>{overview.reason}</span>
          </div>
        )}

        {/* Out of runs */}
        {overview.ready && remaining === 0 && !inProgress && (
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              {quota.limit === 0
                ? "AI analysis is turned off for your account. Contact an admin."
                : `You've used all of today's analyses. More are available ${formatDistanceToNow(new Date(quota.resetsAt), { addSuffix: true })}.`}
            </span>
          </div>
        )}

        {/* In progress */}
        {inProgress && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-4 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Analyzing your resume against this job…</p>
              <p className="text-xs text-muted-foreground">
                This usually takes 15–30 seconds. You can leave this page.
              </p>
            </div>
          </div>
        )}

        {/* Failed */}
        {analysis?.status === "failed" && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm">
            <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>
              {analysis.error || "The analysis failed."} It didn&apos;t count against your daily
              limit.
            </span>
          </div>
        )}

        {/* First run CTA */}
        {!complete && !inProgress && overview.ready && analysis?.status !== "failed" && (
          <p className="text-sm text-muted-foreground">
            See how well this resume matches the job: which requirements it covers, which keywords
            are missing, and specific edits to improve it.
          </p>
        )}

        {complete && complete.score !== null && (
          <>
            {!overview.upToDate && overview.ready && !inProgress && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
                <RotateCcw className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                Your resume or the job description changed since this analysis. Re-analyze to update
                it.
              </div>
            )}

            {/* Score + summary */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ScoreRing score={complete.score} />
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-sm font-semibold", scoreTone(complete.score).text)}>
                    {scoreTone(complete.score).label}
                  </span>
                  {delta !== null && delta !== 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-xs font-medium",
                        delta > 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
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
                <p className="text-sm leading-relaxed">{complete.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {complete.resumeVersionName} · analyzed{" "}
                  {formatDistanceToNow(new Date(complete.completedAt || complete.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>

            <Tabs defaultValue="suggestions" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="suggestions">
                  Suggestions ({openSuggestions.length})
                </TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="keywords">Keywords</TabsTrigger>
                <TabsTrigger value="formatting">Formatting</TabsTrigger>
                {overview.history.length > 1 && <TabsTrigger value="history">History</TabsTrigger>}
              </TabsList>

              {/* Suggestions */}
              <TabsContent value="suggestions" className="space-y-3 pt-3">
                {openSuggestions.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {resolvedSuggestions.length > 0
                      ? "You've worked through every suggestion. Upload your updated resume and re-analyze."
                      : "No suggestions — this resume already covers the job well."}
                  </p>
                )}
                {openSuggestions.map((s) => (
                  <SuggestionCard key={s.id} suggestion={s} onStatus={setSuggestionStatus} />
                ))}
                {resolvedSuggestions.length > 0 && (
                  <div className="pt-1">
                    <button
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setShowResolved((v) => !v)}
                    >
                      {showResolved ? "Hide" : "Show"} done & dismissed (
                      {resolvedSuggestions.length})
                    </button>
                    {showResolved && (
                      <div className="mt-3 space-y-3">
                        {resolvedSuggestions.map((s) => (
                          <SuggestionCard
                            key={s.id}
                            suggestion={s}
                            onStatus={setSuggestionStatus}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Requirements */}
              <TabsContent value="requirements" className="pt-3">
                <ul className="divide-y divide-border/50">
                  {complete.requirements.map((r, i) => (
                    <li key={i} className="flex gap-3 py-2.5">
                      <CoverageIcon coverage={r.coverage} />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium">{r.text}</span>
                          <Badge
                            variant={r.importance === "required" ? "secondary" : "outline"}
                            className="text-[10px]"
                          >
                            {r.importance === "required" ? "Required" : "Preferred"}
                          </Badge>
                        </div>
                        {r.evidence && (
                          <p className="border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                            &ldquo;{r.evidence}&rdquo;
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {r.note}
                          {r.claimedCoverage !== r.coverage && (
                            <span className="ml-1 text-amber-600">
                              (Lowered from &ldquo;{r.claimedCoverage}&rdquo; because the evidence
                              couldn&apos;t be found in your resume.)
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="pt-2 text-[11px] text-muted-foreground">
                  Score = requirements covered, with required ones counting double and partial
                  matches counting half.
                </p>
              </TabsContent>

              {/* Keywords */}
              <TabsContent value="keywords" className="space-y-3 pt-3">
                {(["missing", "present"] as const).map((group) => {
                  const list = complete.keywords.filter(
                    (k) => (group === "present") === k.inResume
                  );
                  if (list.length === 0) return null;
                  return (
                    <div key={group} className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {group === "missing" ? "Not in your resume" : "Already in your resume"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {list.map((k) => (
                          <span
                            key={k.term}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs",
                              k.inResume
                                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                                : "border-border bg-muted/40"
                            )}
                          >
                            {k.inResume && <Check className="h-3 w-3" />}
                            {k.term}
                            {k.importance === "required" && !k.inResume && (
                              <span className="text-[10px] text-red-600">required</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground">
                  Only add a keyword if it&apos;s true for you — you may be asked about it in an
                  interview.
                </p>
              </TabsContent>

              {/* Formatting */}
              <TabsContent value="formatting" className="pt-3">
                <ul className="divide-y divide-border/50">
                  {complete.formatChecks.map((c) => (
                    <li key={c.id} className="flex gap-3 py-2.5">
                      {c.status === "pass" ? (
                        <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{c.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </TabsContent>

              {/* History */}
              {overview.history.length > 1 && (
                <TabsContent value="history" className="pt-3">
                  <ul className="divide-y divide-border/50">
                    {overview.history.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">{h.resumeVersionName}</span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(h.createdAt), "MMM d, h:mm a")}
                          </span>
                          {h.score !== null && (
                            <span
                              className={cn(
                                "w-8 text-right font-semibold tabular-nums",
                                scoreTone(h.score).text
                              )}
                            >
                              {h.score}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionCard({
  suggestion: s,
  onStatus,
}: {
  suggestion: Suggestion;
  onStatus: (s: Suggestion, status: SuggestionStatus) => void;
}) {
  const resolved = s.status !== "open";
  return (
    <div
      className={cn("space-y-2 rounded-lg border border-border/60 p-3", resolved && "opacity-60")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={
                s.priority === "high"
                  ? "destructive"
                  : s.priority === "medium"
                    ? "secondary"
                    : "outline"
              }
              className="text-[10px] capitalize"
            >
              {s.priority}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {SUGGESTION_TYPE_LABEL[s.type] ?? s.type}
            </span>
            {resolved && (
              <span className="text-[11px] font-medium text-muted-foreground">
                · {s.status === "done" ? "Done" : "Dismissed"}
              </span>
            )}
          </div>
          <p className="text-sm font-medium">{s.title}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {resolved ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onStatus(s, "open")}
            >
              Reopen
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onStatus(s, "done")}
                aria-label="Mark done"
                title="Mark done"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onStatus(s, "dismissed")}
                aria-label="Dismiss"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {s.original && (
        <p className="text-xs text-muted-foreground line-through decoration-muted-foreground/40">
          {s.original}
        </p>
      )}

      <div className="group relative rounded-md bg-muted/40 px-3 py-2 pr-9 text-sm">
        {s.suggestedText}
        <button
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => copyText(s.suggestedText)}
          aria-label="Copy suggested text"
          title="Copy"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      {s.rationale && <p className="text-xs text-muted-foreground">{s.rationale}</p>}

      {s.requiresVerification && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Only use this if it&apos;s true — it adds something your resume doesn&apos;t currently
          show.
        </p>
      )}
    </div>
  );
}
