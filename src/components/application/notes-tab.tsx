"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ellipsis, Loader2, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDay } from "@/components/documents/format";
import { NOTE_TYPES } from "@/lib/validators/schemas";
import { cn } from "@/lib/utils";
import { NOTE_TYPE_LABELS } from "./status";
import { apiError, type Note } from "./use-application";

interface Draft {
  type: string;
  title: string;
  body: string;
}

function NoteForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft;
  submitLabel: string;
  onSubmit: (draft: Draft) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [showTitle, setShowTitle] = useState(!!initial.title);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.body.trim()) return;
    setBusy(true);
    const ok = await onSubmit(draft);
    setBusy(false);
    if (ok && !onCancel) {
      setDraft({ type: draft.type, title: "", body: "" });
      setShowTitle(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {showTitle && (
        <div>
          <Label htmlFor={`note-title-${submitLabel}`} className="sr-only">
            Title
          </Label>
          <Input
            id={`note-title-${submitLabel}`}
            value={draft.title}
            maxLength={300}
            placeholder="Title"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            disabled={busy}
          />
        </div>
      )}
      <div>
        <Label htmlFor={`note-body-${submitLabel}`} className="sr-only">
          Note
        </Label>
        <Textarea
          id={`note-body-${submitLabel}`}
          value={draft.body}
          maxLength={10000}
          rows={3}
          placeholder="Write a note: interview questions, who you spoke with, salary details…"
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          disabled={busy}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={draft.type} onValueChange={(v) => v && setDraft({ ...draft, type: v })}>
          <SelectTrigger className="h-8 w-36" aria-label="Note type">
            <SelectValue>{NOTE_TYPE_LABELS[draft.type]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {NOTE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {NOTE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!showTitle && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTitle(true)}
            disabled={busy}
          >
            Add title
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={busy || !draft.body.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function NotesTab({
  applicationId,
  notes,
  onChanged,
}: {
  applicationId: string;
  notes: Note[];
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  async function create(draft: Draft) {
    const res = await fetch(`/api/applications/${applicationId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      toast.error(await apiError(res, "Couldn't save the note"));
      return false;
    }
    toast.success("Note saved");
    await onChanged();
    return true;
  }

  async function patch(id: string, body: Record<string, unknown>, success?: string) {
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error(await apiError(res, "Couldn't update the note"));
      return false;
    }
    if (success) toast.success(success);
    await onChanged();
    return true;
  }

  async function remove(note: Note) {
    const res = await fetch(`/api/notes/${note._id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await apiError(res, "Couldn't delete the note"));
      throw new Error();
    }
    toast.success("Note deleted");
    await onChanged();
  }

  return (
    <div className="max-w-3xl space-y-5">
      <section className="rounded-xl border border-border/70 bg-card p-4">
        <NoteForm
          initial={{ type: "general", title: "", body: "" }}
          submitLabel="Save note"
          onSubmit={create}
        />
      </section>

      {notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n._id}
              className={cn(
                "rounded-xl border bg-card p-4",
                n.pinned ? "border-primary/40" : "border-border/70"
              )}
            >
              {editing === n._id ? (
                <NoteForm
                  initial={{ type: n.type, title: n.title, body: n.body }}
                  submitLabel="Save changes"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (d) => {
                    const ok = await patch(n._id, { ...d }, "Note updated");
                    if (ok) setEditing(null);
                    return ok;
                  }}
                />
              ) : (
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {n.pinned && (
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </span>
                      )}
                      {n.type !== "general" && <span>{NOTE_TYPE_LABELS[n.type] ?? n.type}</span>}
                      <span>{formatDay(n.createdAt)}</span>
                    </p>
                    {n.title && <p className="mt-1 font-medium">{n.title}</p>}
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed wrap-break-word">
                      {n.body}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-2 -mt-1 h-8 w-8 shrink-0"
                          aria-label="Note actions"
                        />
                      }
                    >
                      <Ellipsis className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => patch(n._id, { pinned: !n.pinned })}>
                        {n.pinned ? <PinOff /> : <Pin />}
                        {n.pinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(n._id)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting(n)}>
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this note?"
        description="This can't be undone."
        confirmLabel="Delete note"
        onConfirm={() => remove(deleting!)}
      />
    </div>
  );
}
