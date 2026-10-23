"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Briefcase,
  Download,
  Ellipsis,
  History,
  Loader2,
  Lock,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ResumePreview } from "@/components/resume/resume-preview";
import { ResumeUploadDialog } from "@/components/documents/resume-upload-dialog";
import { ResumeDetailsDialog } from "@/components/documents/resume-details-dialog";
import { fileKind, formatBytes, formatDay } from "@/components/documents/format";
import type { ResumeDetail, ResumeVersionDetail } from "@/components/documents/types";
import { cn } from "@/lib/utils";

async function errorMessage(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  return data.error || fallback;
}

/** Why a version can't be deleted, or null when it can */
function deleteBlocker(v: ResumeVersionDetail): string | null {
  if (v.isCurrent) return "The current version can't be deleted";
  if (v.usedBy.length > 0) return "Used by an application";
  return null;
}

export default function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingVersion, setDeletingVersion] = useState<ResumeVersionDetail | null>(null);

  useEffect(() => {
    fetch(`/api/resumes/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await errorMessage(res, "Couldn't load this resume"));
        return res.json();
      })
      .then((data) => setResume(data.data.resume))
      .catch((err) => setError(err.message));
  }, [id, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">{error}</p>
        <Link href="/documents" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          Back to documents
        </Link>
      </div>
    );
  }
  if (!resume) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const current = resume.versions.find((v) => v.isCurrent) ?? resume.versions[0];
  const shown = resume.versions.find((v) => v.versionNumber === selected) ?? current;

  async function patch(body: Record<string, unknown>, success: string) {
    const res = await fetch(`/api/resumes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return toast.error(await errorMessage(res, "Couldn't update the resume"));
    toast.success(success);
    reload();
  }

  async function restore(v: ResumeVersionDetail) {
    const res = await fetch(`/api/resumes/${id}/versions/${v.versionNumber}/restore`, {
      method: "POST",
    });
    if (!res.ok) return toast.error(await errorMessage(res, "Couldn't restore the version"));
    const data = await res.json();
    toast.success(`Restored v${v.versionNumber} as v${data.data.version.versionNumber}`);
    setSelected(null);
    reload();
  }

  async function deleteVersion(v: ResumeVersionDetail) {
    const res = await fetch(`/api/resumes/${id}/versions/${v.versionNumber}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await errorMessage(res, "Couldn't delete the version"));
      throw new Error();
    }
    toast.success(`Deleted v${v.versionNumber}`);
    if (selected === v.versionNumber) setSelected(null);
    reload();
  }

  async function deleteResume() {
    const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await errorMessage(res, "Couldn't delete the resume"));
      throw new Error();
    }
    toast.success(`Deleted ${resume!.name}`);
    router.push("/documents");
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      <Link
        href="/documents"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Documents
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words">{resume.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {resume.targetRole && <span>{resume.targetRole}</span>}
            {resume.targetIndustry && <span>{resume.targetIndustry}</span>}
            {resume.basedOn && (
              <span>
                Tailored from{" "}
                <Link
                  href={`/documents/resumes/${resume.basedOn.resumeId}`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {`${resume.basedOn.name} v${resume.basedOn.versionNumber}`}
                </Link>
              </span>
            )}
            {!resume.isActive && (
              <span className="inline-flex items-center gap-1 text-foreground">
                <Archive className="h-3.5 w-3.5" />
                Archived
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={() => setUploadOpen(true)} className="flex-1 gap-1.5 sm:flex-none">
            <Upload className="h-4 w-4" />
            Upload new version
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon" aria-label="More actions" />}
            >
              <Ellipsis className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                <Pencil />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  patch(
                    { isActive: !resume.isActive },
                    resume.isActive
                      ? "Archived. It's hidden from your list and from new applications."
                      : "Restored from archive"
                  )
                }
              >
                {resume.isActive ? <Archive /> : <ArchiveRestore />}
                {resume.isActive ? "Archive" : "Restore from archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Delete resume
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Version history */}
        <div className="space-y-6">
          <section aria-labelledby="versions-heading">
            <h2 id="versions-heading" className="mb-2 text-sm font-semibold">
              {`Versions (${resume.versions.length})`}
            </h2>
            <ol className="overflow-hidden rounded-xl border border-border/70 bg-card">
              {resume.versions.map((v) => (
                <VersionRow
                  key={v.fileId}
                  version={v}
                  selected={v.fileId === shown?.fileId}
                  latestVersionNumber={resume.latestVersionNumber}
                  onSelect={() => setSelected(v.versionNumber)}
                  onRestore={() => restore(v)}
                  onDelete={() => setDeletingVersion(v)}
                />
              ))}
            </ol>
          </section>

          {resume.notes && (
            <section aria-labelledby="notes-heading">
              <h2 id="notes-heading" className="mb-2 text-sm font-semibold">
                Notes
              </h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{resume.notes}</p>
            </section>
          )}

          {resume.tailoredInto.length > 0 && (
            <section aria-labelledby="tailored-heading">
              <h2 id="tailored-heading" className="mb-2 text-sm font-semibold">
                Tailored versions
              </h2>
              <ul className="space-y-1 text-sm">
                {resume.tailoredInto.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/documents/resumes/${t.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Preview */}
        {shown && (
          <section
            aria-label={`Preview of v${shown.versionNumber}`}
            className="min-w-0 lg:sticky lg:top-20 lg:self-start"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="truncate text-sm font-semibold">
                {`v${shown.versionNumber}${shown.isCurrent ? " (current)" : ""}`}
                <span className="ml-2 font-normal text-muted-foreground">{shown.displayName}</span>
              </h2>
              <a
                href={`/api/files/${shown.fileId}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 gap-1.5")}
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
            <div className="h-[70vh] overflow-hidden rounded-xl border border-border/70 lg:h-[calc(100vh-10rem)]">
              <ResumePreview
                key={shown.fileId}
                fileId={shown.fileId}
                title={`${resume.name} v${shown.versionNumber}`}
              />
            </div>
          </section>
        )}
      </div>

      <ResumeUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        resume={{
          id: resume.id,
          name: resume.name,
          latestVersionNumber: resume.latestVersionNumber,
        }}
        onDone={() => {
          setSelected(null);
          reload();
        }}
      />
      <ResumeDetailsDialog
        key={`${resume.id}-${resume.updatedAt}`}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        resume={resume}
        onSaved={reload}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${resume.name}?`}
        description={`This deletes all ${resume.versions.length} version${resume.versions.length === 1 ? "" : "s"} and removes it from applications that haven't been submitted. This can't be undone. To keep it, archive it instead.`}
        confirmLabel="Delete resume"
        onConfirm={deleteResume}
      />
      <ConfirmDialog
        open={deletingVersion !== null}
        onOpenChange={(o) => !o && setDeletingVersion(null)}
        title={`Delete v${deletingVersion?.versionNumber}?`}
        description="This version and its file are removed from the history. This can't be undone."
        confirmLabel="Delete version"
        onConfirm={() => deleteVersion(deletingVersion!)}
      />
    </div>
  );
}

function VersionRow({
  version: v,
  selected,
  latestVersionNumber,
  onSelect,
  onRestore,
  onDelete,
}: {
  version: ResumeVersionDetail;
  selected: boolean;
  latestVersionNumber: number;
  onSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const blocker = deleteBlocker(v);

  return (
    <li
      className={cn(
        "relative border-b border-border/70 last:border-b-0",
        selected ? "bg-muted/50" : "hover:bg-muted/30"
      )}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden />}
      <div className="flex items-start gap-2 p-3 pl-4">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="min-w-0 flex-1 text-left after:absolute after:inset-0 focus-visible:outline-none"
        >
          <span className="flex items-center gap-2">
            <span className="font-semibold tabular-nums">v{v.versionNumber}</span>
            {v.isCurrent && <span className="text-sm font-medium text-primary">Current</span>}
            <span className="text-sm text-muted-foreground">{formatDay(v.uploadedAt)}</span>
          </span>
          {v.note && <span className="mt-1 block text-sm">{v.note}</span>}
          <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {v.restoredFromVersion && !v.note && (
              <span className="inline-flex items-center gap-1">
                <History className="h-3 w-3" />
                {`Copy of v${v.restoredFromVersion}`}
              </span>
            )}
            <span>{`${fileKind(v)}, ${formatBytes(v.fileSize)}`}</span>
            {v.bestScore !== null && <span>{`Best match ${v.bestScore}`}</span>}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="relative z-10 -mr-1 h-8 w-8 shrink-0"
                aria-label={`Actions for v${v.versionNumber}`}
              />
            }
          >
            <Ellipsis className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => (window.location.href = `/api/files/${v.fileId}`)}>
              <Download />
              Download
            </DropdownMenuItem>
            {!v.isCurrent && (
              <DropdownMenuItem onClick={onRestore}>
                <RotateCcw />
                {`Make current (as v${latestVersionNumber + 1})`}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={!!blocker} onClick={onDelete}>
              <Trash2 />
              <span className="flex flex-col">
                Delete version
                {blocker && <span className="text-xs text-muted-foreground">{blocker}</span>}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {v.usedBy.length > 0 && (
        <ul className="relative z-10 space-y-1 px-4 pb-3 text-sm">
          {v.usedBy.map((u) => (
            <li key={u.applicationId} className="flex items-center gap-1.5 text-muted-foreground">
              {u.isLocked ? (
                <Lock className="h-3.5 w-3.5 shrink-0" aria-label="Submitted" />
              ) : (
                <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              <Link
                href={`/applications/${u.applicationId}`}
                className="truncate hover:text-foreground hover:underline"
              >
                {u.company ? `${u.jobTitle} at ${u.company}` : u.jobTitle}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
