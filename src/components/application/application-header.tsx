"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Ellipsis,
  ExternalLink,
  Pencil,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  EMPLOYMENT_TYPE_LABELS,
  OUTCOME_STAGES,
  STAGE_STEPS,
  STATUS_GROUPS,
  TONE_DOT,
  WORK_MODE_LABELS,
  formatSalary,
  statusTone,
  stepIndex,
} from "./status";
import type { ApplicationDetails } from "./use-application";

export function StatusDot({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        TONE_DOT[statusTone(status)],
        className
      )}
      aria-hidden
    />
  );
}

export function ApplicationHeader({
  app,
  onUpdate,
  onDelete,
}: {
  app: ApplicationDetails;
  onUpdate: (body: Record<string, unknown>, success?: string) => Promise<boolean>;
  onDelete: () => void;
}) {
  const location = [app.location, WORK_MODE_LABELS[app.workMode]].filter(Boolean).join(", ");
  const facts = [
    location,
    EMPLOYMENT_TYPE_LABELS[app.employmentType],
    app.seniorityLevel,
    formatSalary(app.salaryMin, app.salaryMax, app.currency),
  ].filter(Boolean) as string[];
  const postingUrl = app.jobUrl || app.applicationUrl;

  return (
    <header className="space-y-5">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Applications
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
            {app.jobTitle}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {app.companyId && (
              <Link
                href={`/companies/${app.companyId._id}`}
                className="font-medium text-foreground hover:underline"
              >
                {app.companyId.name}
              </Link>
            )}
            {facts.map((f) => (
              <span key={f}>{f}</span>
            ))}
            {postingUrl && (
              <a
                href={postingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                Job posting
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Select
            value={app.currentStatus}
            onValueChange={(v) =>
              v && v !== app.currentStatus && onUpdate({ currentStatus: v }, `Status set to ${v}`)
            }
          >
            <SelectTrigger className="h-9 flex-1 md:w-60 md:flex-none" aria-label="Status">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <StatusDot status={app.currentStatus} />
                  <span className="truncate">{app.currentStatus}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-96">
              {STATUS_GROUPS.map((g) => (
                <SelectGroup key={g.label}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {g.statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <StatusDot status={s} />
                        {s}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="More actions"
                />
              }
            >
              <Ellipsis className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem render={<Link href={`/applications/${app._id}/edit`} />}>
                <Pencil />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 />
                Delete application
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <StageTrack
        stage={app.lifecycleStage}
        reopenTo={app.appliedAt ? "Applied" : "Saved"}
        onChange={(body, msg) => onUpdate(body, msg)}
      />
    </header>
  );
}

/** Where the application is in the process. Steps are clickable; multi-stage steps open a menu. */
function StageTrack({
  stage,
  reopenTo,
  onChange,
}: {
  stage: string;
  /** Stage to go back to when reopening a closed application */
  reopenTo: "Saved" | "Applied";
  onChange: (body: Record<string, string>, message: string) => void;
}) {
  const outcome = (OUTCOME_STAGES as string[]).includes(stage) ? stage : null;
  const active = stepIndex(stage);

  return (
    <nav
      aria-label="Stage"
      className="rounded-xl border border-border/70 bg-card px-3 py-3 sm:px-4"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Small screens: a progress bar with every stage in one menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="-m-1 min-w-0 flex-1 rounded-md p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden">
            <span className="flex gap-1" aria-hidden>
              {STAGE_STEPS.map((step, i) => (
                <span
                  key={step.label}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    !outcome && i <= active ? "bg-primary" : "bg-border"
                  )}
                />
              ))}
            </span>
            <span className="mt-2 flex items-center gap-1 text-sm">
              <span className="font-semibold">{outcome ? `Closed: ${outcome}` : stage}</span>
              {!outcome && active >= 0 && (
                <span className="text-muted-foreground">{`(step ${active + 1} of ${STAGE_STEPS.length})`}</span>
              )}
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {STAGE_STEPS.map((step) => (
              <DropdownMenuGroup key={step.label}>
                <DropdownMenuLabel>{step.label}</DropdownMenuLabel>
                {step.stages.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() =>
                      s !== stage && onChange({ lifecycleStage: s }, `Stage set to ${s}`)
                    }
                  >
                    {s === stage ? <Check /> : <span className="w-4" />}
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ol className="-mx-1 hidden min-w-0 flex-1 items-center overflow-x-auto px-1 pb-0.5 sm:flex">
          {STAGE_STEPS.map((step, i) => {
            const done = !outcome && i < active;
            const current = !outcome && i === active;
            const content = (
              <>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums",
                    done && "border-primary bg-primary text-primary-foreground",
                    current && "border-primary text-primary ring-4 ring-primary/15",
                    !done && !current && "border-border text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap",
                    current ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </>
            );
            const stepClass =
              "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

            return (
              <li key={step.label} className="flex shrink-0 items-center">
                {i > 0 && (
                  <span
                    className={cn(
                      "mx-1 h-px w-4 sm:w-6 lg:w-10",
                      !outcome && i <= active ? "bg-primary" : "bg-border"
                    )}
                    aria-hidden
                  />
                )}
                {step.stages.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={stepClass}
                      aria-current={current ? "step" : undefined}
                    >
                      {content}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>{step.label}</DropdownMenuLabel>
                        {step.stages.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() =>
                              s !== stage && onChange({ lifecycleStage: s }, `Stage set to ${s}`)
                            }
                          >
                            {s === stage ? <Check /> : <span className="w-4" />}
                            {s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    type="button"
                    className={stepClass}
                    aria-current={current ? "step" : undefined}
                    onClick={() =>
                      step.stages[0] !== stage &&
                      onChange({ lifecycleStage: step.stages[0] }, `Stage set to ${step.stages[0]}`)
                    }
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
              outcome ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <XCircle className={cn("h-4 w-4", outcome === "Rejected" && "text-red-500")} />
            <span className="hidden sm:inline">{outcome ?? "Close"}</span>
            <span className="sr-only sm:hidden">{outcome ? "Reopen" : "Close"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {outcome ? (
              <DropdownMenuItem
                onClick={() => {
                  const stage = reopenTo === "Applied" ? "Applied" : "Saved";
                  onChange({ lifecycleStage: stage, currentStatus: stage }, "Reopened");
                }}
              >
                <Undo2 />
                Reopen
              </DropdownMenuItem>
            ) : (
              OUTCOME_STAGES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() =>
                    onChange(
                      { lifecycleStage: s, currentStatus: s },
                      `Marked as ${s.toLowerCase()}`
                    )
                  }
                >
                  {s === "Rejected" ? "Mark as rejected" : "Mark as withdrawn"}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!outcome && active >= 0 && STAGE_STEPS[active].stages.length > 1 && (
        <p className="mt-1.5 hidden pl-1.5 text-xs text-muted-foreground sm:block">{stage}</p>
      )}
    </nav>
  );
}
