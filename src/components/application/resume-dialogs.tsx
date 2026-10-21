"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDrop } from "@/components/documents/file-drop";
import { formatDay } from "@/components/documents/format";
import type { ApplicationResume, ResumeDetail, ResumeListItem } from "@/components/documents/types";
import { cn } from "@/lib/utils";
import { apiError } from "./use-application";

function nameFromFile(file: File) {
  return file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

/** The user's active resumes, for pickers */
export function useResumeList(enabled: boolean) {
  const [resumes, setResumes] = useState<ResumeListItem[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    fetch("/api/resumes")
      .then((res) => res.json())
      .then((data) => setResumes(data.success ? data.data.resumes : []))
      .catch(() => setResumes([]));
  }, [enabled]);
  return resumes;
}

/**
 * Upload a file from an application. With a resume attached, the user picks whether it's
 * the next version of that resume (default) or a new resume based on it.
 * Remount (key) when initialFile changes.
 */
export function ApplicationUploadDialog({
  open,
  onOpenChange,
  applicationId,
  assigned,
  initialFile = null,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  assigned: ApplicationResume | null;
  initialFile?: File | null;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [mode, setMode] = useState<"version" | "new">(assigned ? "version" : "new");
  const [name, setName] = useState(initialFile ? nameFromFile(initialFile) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const nextVersion = assigned
    ? Math.max(...assigned.versions.map((v) => v.versionNumber), assigned.version.versionNumber) + 1
    : 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      if (mode === "new") form.append("name", name.trim() || nameFromFile(file));
      if (mode === "version" && note.trim()) form.append("note", note.trim());
      const res = await fetch(`/api/applications/${applicationId}/resume/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await apiError(res, "Upload failed"));
      toast.success(
        mode === "version" && assigned
          ? `Uploaded v${nextVersion} of ${assigned.resume.name} and attached it`
          : "Resume added and attached"
      );
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const choice = (value: "version" | "new", title: string, description: string) => (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
        mode === value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
      )}
    >
      <input
        type="radio"
        name="upload-mode"
        value={value}
        checked={mode === value}
        onChange={() => setMode(value)}
        className="mt-0.5 accent-[var(--primary)]"
        disabled={busy}
      />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a resume</DialogTitle>
          <DialogDescription>The upload is attached to this application.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FileDrop
            file={file}
            compact
            disabled={busy}
            onChange={(f) => {
              setFile(f);
              if (f && !name) setName(nameFromFile(f));
            }}
          />
          {assigned && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Save it as</legend>
              {choice(
                "version",
                `v${nextVersion} of ${assigned.resume.name}`,
                "You updated the same resume. Other applications keep the version they used."
              )}
              {choice(
                "new",
                "A new resume",
                `A separate resume tailored from ${assigned.resume.name}.`
              )}
            </fieldset>
          )}
          {mode === "version" ? (
            <div className="space-y-1.5">
              <Label htmlFor="app-upload-note">What changed? (optional)</Label>
              <Input
                id="app-upload-note"
                value={note}
                maxLength={300}
                placeholder="e.g. Tailored the summary for this role"
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="app-upload-name">Resume name</Label>
              <Input
                id="app-upload-name"
                value={name}
                maxLength={200}
                placeholder="e.g. Backend resume"
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </div>
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
              Upload and attach
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Pick one of the user's resumes, and optionally an older version of it. */
export function ChooseResumeDialog({
  open,
  onOpenChange,
  applicationId,
  assigned,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  assigned: ApplicationResume | null;
  onDone: () => void;
}) {
  const resumes = useResumeList(open);
  const [resumeId, setResumeId] = useState(assigned?.resume.id ?? "");
  const [version, setVersion] = useState<string>(
    assigned?.newerVersion ? String(assigned.version.versionNumber) : "latest"
  );
  const [detail, setDetail] = useState<ResumeDetail | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !resumeId) return;
    fetch(`/api/resumes/${resumeId}`)
      .then((res) => res.json())
      .then((data) => setDetail(data.success ? data.data.resume : null))
      .catch(() => setDetail(null));
  }, [open, resumeId]);

  const versions = detail?.id === resumeId ? detail.versions : [];
  const selectedResume = resumes?.find((r) => r.id === resumeId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!resumeId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          version === "latest" ? { resumeId } : { resumeId, versionNumber: Number(version) }
        ),
      });
      if (!res.ok) throw new Error(await apiError(res, "Couldn't attach the resume"));
      toast.success("Resume attached");
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't attach the resume");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{assigned ? "Change resume" : "Choose a resume"}</DialogTitle>
          <DialogDescription>
            Pick the resume and version you&apos;re sending with this application.
          </DialogDescription>
        </DialogHeader>
        {resumes === null ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : resumes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any resumes yet. Upload one instead.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="choose-resume">Resume</Label>
              <Select
                value={resumeId}
                onValueChange={(v) => {
                  if (!v) return;
                  setResumeId(v);
                  setVersion("latest");
                }}
              >
                <SelectTrigger id="choose-resume" className="w-full">
                  <SelectValue>
                    {selectedResume?.name ?? (resumeId ? assigned?.resume.name : "Choose a resume")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {resumeId && versions.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="choose-version">Version</Label>
                <Select value={version} onValueChange={(v) => v && setVersion(v)}>
                  <SelectTrigger id="choose-version" className="w-full">
                    <SelectValue>
                      {version === "latest"
                        ? `Current (v${versions.find((v) => v.isCurrent)?.versionNumber})`
                        : `v${version}`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">{`Current (v${versions.find((v) => v.isCurrent)?.versionNumber})`}</SelectItem>
                    {versions
                      .filter((v) => !v.isCurrent)
                      .map((v) => (
                        <SelectItem key={v.fileId} value={String(v.versionNumber)}>
                          {`v${v.versionNumber}, ${formatDay(v.uploadedAt)}${v.note ? `: ${v.note}` : ""}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Button type="submit" disabled={!resumeId || busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Attach resume
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
