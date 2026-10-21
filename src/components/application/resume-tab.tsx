"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpCircle,
  Download,
  Ellipsis,
  FileText,
  Loader2,
  Lock,
  Replace,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ResumePreview } from "@/components/resume/resume-preview";
import { ResumeAnalysisPanel } from "@/components/resume/resume-analysis-panel";
import { FileDrop } from "@/components/documents/file-drop";
import { fileKind, formatBytes, formatDay } from "@/components/documents/format";
import type { ApplicationResume } from "@/components/documents/types";
import { ApplicationUploadDialog, ChooseResumeDialog } from "./resume-dialogs";
import { apiError } from "./use-application";

export function ResumeTab({
  applicationId,
  assigned,
  onChanged,
}: {
  applicationId: string;
  assigned: ApplicationResume | null | undefined;
  onChanged: () => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  function openUpload(file: File | null = null) {
    setDroppedFile(file);
    setDialogKey((k) => k + 1);
    setUploadOpen(true);
  }

  function openChoose() {
    setDialogKey((k) => k + 1);
    setChooseOpen(true);
  }

  async function switchToLatest() {
    if (!assigned?.newerVersion) return;
    setSwitching(true);
    const res = await fetch(`/api/applications/${applicationId}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeId: assigned.resume.id,
        versionNumber: assigned.newerVersion.versionNumber,
      }),
    });
    setSwitching(false);
    if (!res.ok) return toast.error(await apiError(res, "Couldn't switch versions"));
    toast.success(`Switched to v${assigned.newerVersion.versionNumber}`);
    onChanged();
  }

  async function remove() {
    const res = await fetch(`/api/applications/${applicationId}/resume`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await apiError(res, "Couldn't remove the resume"));
      throw new Error();
    }
    toast.success("Resume removed from this application");
    onChanged();
  }

  const dialogs = (
    <>
      <ApplicationUploadDialog
        key={`upload-${dialogKey}`}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        applicationId={applicationId}
        assigned={assigned ?? null}
        initialFile={droppedFile}
        onDone={onChanged}
      />
      <ChooseResumeDialog
        key={`choose-${dialogKey}`}
        open={chooseOpen}
        onOpenChange={setChooseOpen}
        applicationId={applicationId}
        assigned={assigned ?? null}
        onDone={onChanged}
      />
    </>
  );

  if (assigned === undefined) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assigned) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-4">
        <div className="text-center">
          <p className="text-base font-medium">Which resume are you sending?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Attach it to keep a record of the exact version you sent and to check how well it
            matches the job.
          </p>
        </div>
        <FileDrop file={null} onChange={(f) => f && openUpload(f)} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="text-center">
          <Button variant="outline" onClick={openChoose}>
            Choose from your resumes
          </Button>
        </div>
        {dialogs}
      </div>
    );
  }

  const { resume, version, isLocked, newerVersion } = assigned;

  return (
    <div className="space-y-4">
      {isLocked ? (
        <div className="flex gap-3 rounded-xl border border-border/70 bg-muted/40 p-3 text-sm sm:p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p>
            <span className="font-medium">This is the version you sent.</span>{" "}
            <span className="text-muted-foreground">
              It stays attached as a record once an application is marked Applied. Newer versions of
              the resume don&apos;t change it.
            </span>
          </p>
        </div>
      ) : (
        newerVersion && (
          <div className="flex flex-col gap-3 rounded-xl border border-sky-500/40 bg-sky-500/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <p className="flex gap-3">
              <ArrowUpCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <span>
                <span className="font-medium">{`v${newerVersion.versionNumber} of ${resume.name} is available.`}</span>{" "}
                <span className="text-muted-foreground">{`This application uses v${version.versionNumber}.`}</span>
              </span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={switchToLatest}
              disabled={switching}
              className="shrink-0 self-start sm:self-auto"
            >
              {switching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {`Switch to v${newerVersion.versionNumber}`}
            </Button>
          </div>
        )
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 lg:sticky lg:top-4 lg:order-2 lg:self-start">
          <div className="h-[70vh] overflow-hidden rounded-xl border border-border/70 lg:h-[calc(100vh-8rem)]">
            <ResumePreview
              key={version.fileId}
              fileId={version.fileId}
              title={`${resume.name} v${version.versionNumber}`}
            />
          </div>
        </div>

        <div className="order-first min-w-0 space-y-4 lg:order-1">
          <section className="rounded-xl border border-border/70 bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/documents/resumes/${resume.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {resume.name}
                </Link>
                <p className="text-sm text-muted-foreground">{`v${version.versionNumber}, uploaded ${formatDay(version.uploadedAt)}`}</p>
                {version.note && <p className="mt-1 text-sm">{version.note}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{`${fileKind(version)}, ${formatBytes(version.fileSize)}`}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-2 -mt-1 h-8 w-8 shrink-0"
                      aria-label="Resume actions"
                    />
                  }
                >
                  <Ellipsis className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => (window.location.href = `/api/files/${version.fileId}`)}
                  >
                    <Download />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`/documents/resumes/${resume.id}`} />}>
                    <FileText />
                    Open in Documents
                  </DropdownMenuItem>
                  {!isLocked && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setRemoveOpen(true)}>
                        <Trash2 />
                        Remove from application
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {!isLocked && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openUpload()}
                  className="gap-1.5"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
                <Button variant="outline" size="sm" onClick={openChoose} className="gap-1.5">
                  <Replace className="h-4 w-4" />
                  Change
                </Button>
              </div>
            )}
          </section>

          <ResumeAnalysisPanel key={version.fileId} applicationId={applicationId} />
        </div>
      </div>

      {dialogs}
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove the resume from this application?"
        description={`${resume.name} stays in your documents. Only the link to this application is removed.`}
        confirmLabel="Remove"
        onConfirm={remove}
      />
    </div>
  );
}
