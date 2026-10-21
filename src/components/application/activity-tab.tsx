"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ellipsis, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { eventDay } from "@/components/documents/format";
import { TIMELINE_EVENT_TYPES } from "@/lib/validators/schemas";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { EVENT_TYPE_DOT, EVENT_TYPE_LABELS, STATUS_GROUPS } from "./status";
import { apiError, type TimelineEvent } from "./use-application";

function today() {
  return format(new Date(), "yyyy-MM-dd");
}

export function ActivityTab({
  applicationId,
  timeline,
  onChanged,
}: {
  applicationId: string;
  timeline: TimelineEvent[];
  onChanged: () => Promise<void>;
}) {
  const [dialog, setDialog] = useState<{ event: TimelineEvent | null; key: number } | null>(null);
  const [deleting, setDeleting] = useState<TimelineEvent | null>(null);

  async function remove(e: TimelineEvent) {
    const res = await fetch(`/api/timeline/${e._id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await apiError(res, "Couldn't delete the event"));
      throw new Error();
    }
    toast.success("Event deleted");
    await onChanged();
  }

  // Group by month so a long history stays scannable
  const groups: { month: string; events: TimelineEvent[] }[] = [];
  for (const e of timeline) {
    const month = format(eventDay(e.eventDate), "MMMM yyyy");
    const last = groups[groups.length - 1];
    if (last?.month === month) last.events.push(e);
    else groups.push({ month, events: [e] });
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Interviews, emails, and follow-ups. Status changes are added automatically.
        </p>
        <Button
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => setDialog({ event: null, key: Date.now() })}
        >
          <Plus className="h-4 w-4" />
          Log event
        </Button>
      </div>

      {timeline.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nothing logged yet.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.month}>
            <h2 className="mb-2 text-sm font-semibold">{g.month}</h2>
            <ol className="relative space-y-1 border-l border-border/80 pl-5">
              {g.events.map((e) => (
                <li key={e._id} className="group relative rounded-lg py-2 pr-1">
                  <span
                    className={cn(
                      "absolute -left-[25px] top-3.5 h-2.5 w-2.5 rounded-full ring-4 ring-background",
                      EVENT_TYPE_DOT[e.type] ?? "bg-muted-foreground/60"
                    )}
                    aria-hidden
                  />
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {`${format(eventDay(e.eventDate), "EEE, MMM d")}${e.type !== "status_change" && e.type !== "custom" ? `, ${EVENT_TYPE_LABELS[e.type] ?? e.type}` : ""}`}
                      </p>
                      {e.description && e.type !== "status_change" && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground wrap-break-word">
                          {e.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            aria-label="Event actions"
                          />
                        }
                      >
                        <Ellipsis className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setDialog({ event: e, key: Date.now() })}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(e)}>
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}

      {dialog && (
        <EventDialog
          key={dialog.key}
          applicationId={applicationId}
          event={dialog.event}
          onClose={() => setDialog(null)}
          onSaved={onChanged}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this event?"
        description="It's removed from the activity log. The application's status doesn't change."
        confirmLabel="Delete event"
        onConfirm={() => remove(deleting!)}
      />
    </div>
  );
}

const LOGGABLE_TYPES = TIMELINE_EVENT_TYPES.filter((t) => t !== "status_change" && t !== "note");

function EventDialog({
  applicationId,
  event,
  onClose,
  onSaved,
}: {
  applicationId: string;
  event: TimelineEvent | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState(event?.type ?? "interview");
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(
    event ? format(eventDay(event.eventDate), "yyyy-MM-dd") : today()
  );
  const [description, setDescription] = useState(event?.description ?? "");
  const [status, setStatus] = useState(event?.statusAfterEvent ?? "none");
  const [busy, setBusy] = useState(false);
  const types =
    event && !(LOGGABLE_TYPES as string[]).includes(event.type)
      ? [event.type, ...LOGGABLE_TYPES]
      : LOGGABLE_TYPES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const body = {
      type,
      title: title.trim(),
      description,
      eventDate: date,
      // Only a new event can change the status; editing one leaves it as logged
      statusAfterEvent: !event && status !== "none" ? status : undefined,
    };
    const res = await fetch(
      event ? `/api/timeline/${event._id}` : `/api/applications/${applicationId}/timeline`,
      {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setBusy(false);
    if (!res.ok) return toast.error(await apiError(res, "Couldn't save the event"));
    toast.success(event ? "Event updated" : "Event logged");
    onClose();
    await onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Log an event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-type">Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger id="ev-type" className="w-full">
                  <SelectValue>{EVENT_TYPE_LABELS[type] ?? type}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {EVENT_TYPE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Date</Label>
              <Input
                id="ev-date"
                type="date"
                value={date}
                required
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">What happened</Label>
            <Input
              id="ev-title"
              value={title}
              maxLength={300}
              required
              placeholder="e.g. Phone screen with the hiring manager"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Details (optional)</Label>
            <Textarea
              id="ev-desc"
              value={description}
              maxLength={5000}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {!event && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-status">Also update the status (optional)</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger id="ev-status" className="w-full">
                  <SelectValue>
                    {status === "none" ? "Keep the current status" : status}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="none">Keep the current status</SelectItem>
                  {STATUS_GROUPS.map((g) => (
                    <SelectGroup key={g.label}>
                      <SelectLabel>{g.label}</SelectLabel>
                      {g.statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {event ? "Save changes" : "Log event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
