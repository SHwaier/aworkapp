"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function JobDescriptionTab({
  description,
  onSave,
}: {
  description: string;
  onSave: (body: Record<string, unknown>, success?: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(!description);
  const [text, setText] = useState(description);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSave({ jobDescription: text }, "Job description saved");
    setBusy(false);
    if (ok && text.trim()) setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={save} className="max-w-3xl space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="job-description">Job description</Label>
          {!description && (
            <p className="text-sm text-muted-foreground">
              Paste the posting so you have it after it&apos;s taken down. The resume match uses it
              too.
            </p>
          )}
          <Textarea
            id="job-description"
            value={text}
            maxLength={50000}
            rows={16}
            placeholder="Paste the full job posting"
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            className="text-sm leading-relaxed"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy || text === description}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save description
          </Button>
          {description && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setText(description);
                setEditing(false);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setText(description);
            setEditing(true);
          }}
        >
          Edit
        </Button>
      </div>
      <article className="max-w-prose text-[15px] leading-7 whitespace-pre-wrap wrap-break-word text-foreground/90">
        {description}
      </article>
    </div>
  );
}
