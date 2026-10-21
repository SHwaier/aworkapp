"use client";

import { useState } from "react";
import { format, isBefore, startOfToday } from "date-fns";
import { CalendarClock, FileText, Loader2, Lock, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calendarDay, eventDay, formatDay } from "@/components/documents/format";
import type { ApplicationResume } from "@/components/documents/types";
import { cn } from "@/lib/utils";
import { EVENT_TYPE_DOT, NOTE_TYPE_LABELS } from "./status";
import type { ApplicationDetails, Note, TimelineEvent } from "./use-application";

export type ApplicationTab = "overview" | "resume" | "job" | "notes" | "activity";

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border/70 bg-card p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function OverviewTab({
  app,
  timeline,
  notes,
  assigned,
  onUpdate,
  goTo,
}: {
  app: ApplicationDetails;
  timeline: TimelineEvent[];
  notes: Note[];
  assigned: ApplicationResume | null | undefined;
  onUpdate: (body: Record<string, unknown>, success?: string) => Promise<boolean>;
  goTo: (tab: ApplicationTab) => void;
}) {
  const pinned = notes.filter((n) => n.pinned);
  const details = [
    {
      label: "Applied",
      value: app.appliedAt ? formatDay(calendarDay(app.appliedAt).toISOString()) : null,
    },
    {
      label: "Deadline",
      value: app.applicationDeadline
        ? formatDay(calendarDay(app.applicationDeadline).toISOString())
        : null,
    },
    { label: "Found on", value: app.source || null },
    { label: "Added", value: formatDay(app.createdAt) },
  ].filter((d) => d.value);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div className="space-y-4">
        <NextStep app={app} onUpdate={onUpdate} />

        {pinned.length > 0 && (
          <Section
            title="Pinned notes"
            action={
              <button
                type="button"
                onClick={() => goTo("notes")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                All notes
              </button>
            }
          >
            <ul className="space-y-3">
              {pinned.map((n) => (
                <li key={n._id} className="flex gap-2.5">
                  <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    {n.title && <p className="text-sm font-medium">{n.title}</p>}
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {n.body}
                    </p>
                    {n.type !== "general" && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {NOTE_TYPE_LABELS[n.type]}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section
          title="Recent activity"
          action={
            timeline.length > 0 && (
              <button
                type="button"
                onClick={() => goTo("activity")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {`All activity (${timeline.length})`}
              </button>
            )
          }
        >
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing logged yet. Status changes are recorded here automatically.
            </p>
          ) : (
            <ul className="space-y-3">
              {timeline.slice(0, 4).map((e) => (
                <li key={e._id} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      EVENT_TYPE_DOT[e.type] ?? "bg-muted-foreground/60"
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDay(eventDay(e.eventDate))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="space-y-4">
        <Section title="Resume">
          {assigned === undefined ? (
            <div className="h-10" />
          ) : assigned ? (
            <button
              type="button"
              onClick={() => goTo("resume")}
              className="-m-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-lg p-2 text-left hover:bg-muted/50"
            >
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{`${assigned.resume.name} v${assigned.version.versionNumber}`}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  {assigned.isLocked ? (
                    <>
                      <Lock className="h-3 w-3" />
                      Sent with this application
                    </>
                  ) : assigned.newerVersion ? (
                    `v${assigned.newerVersion.versionNumber} is available`
                  ) : (
                    "Latest version"
                  )}
                </span>
              </span>
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Attach the resume you&apos;re sending to track it and check the match.
              </p>
              <Button variant="outline" size="sm" onClick={() => goTo("resume")}>
                Attach a resume
              </Button>
            </div>
          )}
        </Section>

        <Section title="Details">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {details.map((d) => (
              <div key={d.label} className="contents">
                <dt className="text-muted-foreground">{d.label}</dt>
                <dd className="text-right">{d.value}</dd>
              </div>
            ))}
          </dl>
          {!app.jobDescription && (
            <p className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
              Add the job description to compare your resume against it.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function toDateInput(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function NextStep({
  app,
  onUpdate,
}: {
  app: ApplicationDetails;
  onUpdate: (body: Record<string, unknown>, success?: string) => Promise<boolean>;
}) {
  const hasStep = !!app.nextAction;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(app.nextAction);
  const [due, setDue] = useState(toDateInput(app.nextActionDueAt));
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setText(app.nextAction);
    setDue(toDateInput(app.nextActionDueAt));
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await onUpdate(
      { nextAction: text.trim(), nextActionDueAt: text.trim() && due ? due : null },
      text.trim() ? "Next step saved" : "Next step cleared"
    );
    setBusy(false);
    if (ok) setEditing(false);
  }

  async function markDone() {
    setBusy(true);
    await onUpdate({ nextAction: "", nextActionDueAt: null }, "Next step done");
    setBusy(false);
  }

  const dueDate = app.nextActionDueAt ? calendarDay(app.nextActionDueAt) : null;
  const overdue = dueDate && isBefore(dueDate, startOfToday());

  if (editing || !hasStep) {
    return (
      <Section title="Next step">
        <form onSubmit={save} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="space-y-1.5">
              <Label htmlFor="next-action" className="sr-only">
                What&apos;s next
              </Label>
              <Input
                id="next-action"
                value={text}
                maxLength={500}
                placeholder="e.g. Follow up with the recruiter"
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next-due" className="sr-only">
                Due date
              </Label>
              <Input
                id="next-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
          {(editing || text.trim()) && (
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy || (!text.trim() && !hasStep)}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save next step
              </Button>
              {editing && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </form>
      </Section>
    );
  }

  return (
    <Section
      title="Next step"
      className={cn(overdue && "border-amber-500/50")}
      action={
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={startEdit} disabled={busy}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={markDone} disabled={busy}>
            Done
          </Button>
        </div>
      }
    >
      <p className="text-base font-medium">{app.nextAction}</p>
      {dueDate && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1.5 text-sm",
            overdue ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
          )}
        >
          <CalendarClock className="h-4 w-4" />
          {overdue
            ? `Overdue since ${format(dueDate, "MMM d")}`
            : `Due ${format(dueDate, "EEEE, MMM d")}`}
        </p>
      )}
    </Section>
  );
}
