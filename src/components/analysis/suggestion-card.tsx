"use client";

import { toast } from "sonner";
import { AlertTriangle, Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Suggestion, SuggestionStatus } from "./types";

const SUGGESTION_TYPE_LABEL: Record<string, string> = {
  rewrite_bullet: "Rewrite bullet",
  add_keyword: "Add keyword",
  add_content: "Add content",
  remove_content: "Remove",
  reorder: "Reorder",
  wording: "Wording",
};

export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}

export function SuggestionCard({
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
