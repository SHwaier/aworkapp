"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDrop } from "./file-drop";

function nameFromFile(file: File) {
  return file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

async function errorMessage(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  return (
    data.errors?.map((e: { message: string }) => e.message).join(", ") || data.error || fallback
  );
}

/**
 * Upload a new resume (v1), or the next version of an existing one.
 * Calls onDone with the API response data.
 */
export function ResumeUploadDialog({
  open,
  onOpenChange,
  resume,
  initialFile = null,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the upload becomes the next version of this resume */
  resume?: { id: string; name: string; latestVersionNumber?: number } | null;
  /** A file the user already dropped on the page; remount (key) the dialog when it changes */
  initialFile?: File | null;
  onDone: (data: { resume: { _id?: string; id?: string }; version: unknown }) => void;
}) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [name, setName] = useState(initialFile && !resume ? nameFromFile(initialFile) : "");
  const [targetRole, setTargetRole] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const isVersion = !!resume;

  function reset() {
    setFile(null);
    setName("");
    setTargetRole("");
    setNote("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (isVersion) {
        if (note.trim()) form.append("note", note.trim());
      } else {
        form.append("name", name.trim() || nameFromFile(file));
        if (targetRole.trim()) form.append("targetRole", targetRole.trim());
      }
      const res = await fetch(isVersion ? `/api/resumes/${resume.id}/versions` : "/api/resumes", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Upload failed"));
      const data = await res.json();
      toast.success(
        isVersion
          ? `Uploaded v${data.data.version.versionNumber} of ${resume.name}`
          : "Resume added"
      );
      reset();
      onOpenChange(false);
      onDone(data.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isVersion ? "Upload a new version" : "Add a resume"}</DialogTitle>
          <DialogDescription>
            {isVersion
              ? `It becomes v${(resume.latestVersionNumber ?? 0) + 1} of ${resume.name}. Earlier versions stay in its history.`
              : "Upload your resume. Later uploads of the same resume become new versions."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FileDrop
            file={file}
            disabled={busy}
            onChange={(f) => {
              setFile(f);
              if (f && !isVersion && !name) setName(nameFromFile(f));
            }}
          />
          {isVersion ? (
            <div className="space-y-1.5">
              <Label htmlFor="version-note">What changed? (optional)</Label>
              <Input
                id="version-note"
                value={note}
                maxLength={300}
                placeholder="e.g. Added AWS projects"
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="resume-name">Name</Label>
                <Input
                  id="resume-name"
                  value={name}
                  maxLength={200}
                  placeholder="e.g. Backend resume"
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resume-role">Target role (optional)</Label>
                <Input
                  id="resume-role"
                  value={targetRole}
                  maxLength={200}
                  placeholder="e.g. Senior backend engineer"
                  onChange={(e) => setTargetRole(e.target.value)}
                  disabled={busy}
                />
              </div>
            </>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isVersion ? "Upload version" : "Add resume"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
