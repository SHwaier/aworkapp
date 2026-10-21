"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionStep } from "@/lib/ai/analysis/types";
import { PriorityMatrix } from "../charts";
import { copyText, PRIORITY_ORDER } from "../utils";
import type { Suggestion, SuggestionStatus } from "../types";
import { Disclosure } from "./disclosure";
import { Panel } from "./overview-tab";

const TYPE_LABEL: Record<string, string> = {
  rewrite_bullet: "Rewrite a bullet",
  add_keyword: "Add a keyword",
  add_content: "Add content",
  remove_content: "Remove content",
  reorder: "Reorder",
  wording: "Wording",
};

const PRIORITY_DOT: Record<Suggestion["priority"], string> = {
  high: "var(--viz-critical)",
  medium: "var(--viz-warning)",
  low: "var(--muted-foreground)",
};

const FILTERS = ["all", "high", "medium", "low"] as const;
type Filter = (typeof FILTERS)[number];

function Level({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
      <span className="capitalize">{value}</span> {label}
    </span>
  );
}

export function FixTab({
  steps,
  suggestions,
  onSuggestionStatus,
  insightsNote,
}: {
  steps: ActionStep[];
  suggestions: Suggestion[];
  onSuggestionStatus: (s: Suggestion, status: SuggestionStatus) => void;
  /** Shown instead of the plan when insights are unavailable */
  insightsNote: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showResolved, setShowResolved] = useState(false);

  const numbered = steps.map((s, i) => ({ ...s, number: i + 1 }));
  const sorted = [...suggestions].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
  const open = sorted.filter((s) => s.status === "open");
  const resolved = sorted.filter((s) => s.status !== "open");
  const visible = (showResolved ? resolved : open).filter(
    (s) => filter === "all" || s.priority === filter
  );
  const countFor = (f: Filter) => open.filter((s) => f === "all" || s.priority === f).length;

  return (
    <div className="space-y-12">
      <Panel title="Plan" hint="Biggest impact first. Quick wins are high impact and low effort.">
        {numbered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{insightsNote}</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <ol className="space-y-5">
              {numbered.map((s) => (
                <li key={s.number} id={`step-${s.number}`} className="flex scroll-mt-28 gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: "var(--viz-series-1)" }}
                  >
                    {s.number}
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-medium leading-snug">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.detail}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Level label="impact" value={s.impact} />
                      <Level label="effort" value={s.effort} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="hidden self-start lg:sticky lg:top-16 lg:block">
              <p className="mb-2 text-sm font-medium">Impact vs. effort</p>
              <PriorityMatrix steps={numbered} />
            </div>
            <Disclosure
              className="lg:hidden"
              summaryClassName="text-sm font-medium text-muted-foreground hover:text-foreground"
              summary="Show impact vs. effort"
            >
              <div className="mt-3">
                <PriorityMatrix steps={numbered} />
              </div>
            </Disclosure>
          </div>
        )}
      </Panel>

      <Panel
        title="Edits"
        hint="Specific changes to make in your resume file. Mark them done as you go."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter by priority"
            className="inline-flex rounded-lg bg-muted p-0.5"
          >
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-sm capitalize text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f && "bg-background font-medium text-foreground shadow-sm"
                )}
              >
                {f === "all" ? "All" : f}
                {!showResolved && (
                  <span className="ml-1 tabular-nums opacity-70">{countFor(f)}</span>
                )}
              </button>
            ))}
          </div>
          {resolved.length > 0 && (
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {showResolved ? "Show open edits" : `Show done and dismissed (${resolved.length})`}
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {showResolved
              ? "Nothing here for this filter."
              : open.length === 0
                ? "You've worked through every edit. Upload your updated resume and re-analyze to see your new score."
                : "No open edits at this priority."}
          </p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
            {visible.map((s) => (
              <li key={s.id}>
                <EditRow suggestion={s} onStatus={onSuggestionStatus} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function EditRow({
  suggestion: s,
  onStatus,
}: {
  suggestion: Suggestion;
  onStatus: (s: Suggestion, status: SuggestionStatus) => void;
}) {
  const resolved = s.status !== "open";
  return (
    <Disclosure
      summaryClassName="p-4"
      summary={
        <div className={cn("space-y-1", resolved && "opacity-60")}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: PRIORITY_DOT[s.priority] }}
              aria-hidden
            />
            <span>{s.priority[0].toUpperCase() + s.priority.slice(1)} priority</span>
            <span aria-hidden>/</span>
            <span>{TYPE_LABEL[s.type] ?? s.type}</span>
            {resolved && (
              <span className="font-medium">({s.status === "done" ? "done" : "dismissed"})</span>
            )}
          </div>
          <p className="font-medium leading-snug">{s.title}</p>
          <p className="line-clamp-1 text-sm text-muted-foreground group-open:hidden">
            {s.suggestedText}
          </p>
        </div>
      }
    >
      <div className="space-y-4 px-4 pb-4">
        {s.original && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Now</p>
            <p className="rounded-lg border border-border/70 px-3 py-2 text-sm text-muted-foreground">
              {s.original}
            </p>
          </div>
        )}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {s.original ? "Suggested" : "Change"}
          </p>
          <div className="flex items-start gap-2 rounded-lg bg-[var(--viz-series-1-wash)] px-3 py-2">
            <p className="min-w-0 flex-1 text-sm">{s.suggestedText}</p>
            <button
              type="button"
              onClick={() => copyText(s.suggestedText)}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label="Copy suggested text"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
        {s.rationale && <p className="text-sm text-muted-foreground">{s.rationale}</p>}
        {s.requiresVerification && (
          <p className="flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Only use this if it&apos;s true for you. It adds something your resume doesn&apos;t show
            yet.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {resolved ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onStatus(s, "open")}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen
            </Button>
          ) : (
            <>
              <Button size="sm" className="gap-1.5" onClick={() => onStatus(s, "done")}>
                <Check className="h-3.5 w-3.5" />
                Mark done
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => onStatus(s, "dismissed")}
              >
                <X className="h-3.5 w-3.5" />
                Dismiss
              </Button>
            </>
          )}
        </div>
      </div>
    </Disclosure>
  );
}
