"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Overview, Suggestion, SuggestionStatus } from "./types";

const POLL_MS = 2500;

/**
 * Loads an application's resume analysis, polls while a run is in progress,
 * and exposes the actions shared by the Resume tab card and the report page.
 */
export function useResumeAnalysis(applicationId: string) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const reload = () => setRefreshKey((k) => k + 1);

  async function analyze() {
    setIsStarting(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/analysis`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start the analysis");
      if (!data.data.started) toast.info("Nothing changed since the last analysis");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start the analysis");
    } finally {
      setIsStarting(false);
    }
  }

  async function setSuggestionStatus(suggestion: Suggestion, status: SuggestionStatus) {
    const previous = overview;
    const update = (a: Overview["analysis"]) =>
      a
        ? {
            ...a,
            suggestions: a.suggestions.map((s) => (s.id === suggestion.id ? { ...s, status } : s)),
          }
        : a;
    setOverview((o) =>
      o ? { ...o, analysis: update(o.analysis), lastComplete: update(o.lastComplete) } : o
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

  const analysis = overview?.analysis ?? null;
  const inProgress = analysis?.status === "queued" || analysis?.status === "running";
  // While a re-run is in progress (or failed), keep showing the last complete report
  const latestComplete =
    analysis?.status === "complete" ? analysis : (overview?.lastComplete ?? null);
  const complete = latestComplete && latestComplete.score !== null ? latestComplete : null;
  const quota = overview?.quota ?? null;
  const remaining = !quota || quota.limit === null ? null : Math.max(0, quota.limit - quota.used);
  // A run for an old resume version doesn't block analyzing the current one
  const outdatedRun = inProgress && !!overview?.inProgressOutdated;
  const canRun =
    !!overview?.ready &&
    (!inProgress || outdatedRun) &&
    (remaining === null || remaining > 0) &&
    !(overview.upToDate && complete);

  return {
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
    setSuggestionStatus,
  };
}

export function scoreBand(score: number) {
  if (score >= 75) return { label: "Strong match", tone: "good" as const };
  if (score >= 50) return { label: "Partial match", tone: "warning" as const };
  return { label: "Weak match", tone: "critical" as const };
}
