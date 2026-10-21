"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import type { ResumeDetail } from "./types";

/** Edit a resume's name, target role, industry, and notes. Remount (key) to reset. */
export function ResumeDetailsDialog({
  open,
  onOpenChange,
  resume,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: ResumeDetail;
  onSaved: () => void;
}) {
  const [name, setName] = useState(resume.name);
  const [targetRole, setTargetRole] = useState(resume.targetRole);
  const [targetIndustry, setTargetIndustry] = useState(resume.targetIndustry);
  const [notes, setNotes] = useState(resume.notes);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/resumes/${resume.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetRole, targetIndustry, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.errors?.[0]?.message || data.error || "Couldn't save the details");
      }
      toast.success("Details saved");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the details");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit details</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rd-name">Name</Label>
            <Input
              id="rd-name"
              value={name}
              maxLength={200}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rd-role">Target role</Label>
              <Input
                id="rd-role"
                value={targetRole}
                maxLength={200}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rd-industry">Industry</Label>
              <Input
                id="rd-industry"
                value={targetIndustry}
                maxLength={200}
                onChange={(e) => setTargetIndustry(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rd-notes">Notes</Label>
            <Textarea
              id="rd-notes"
              value={notes}
              maxLength={5000}
              rows={4}
              placeholder="When to use this resume, what it emphasizes"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
