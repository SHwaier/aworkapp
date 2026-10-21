"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Ellipsis,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { FileDrop } from "./file-drop";
import { ResumeUploadDialog } from "./resume-upload-dialog";
import { formatDay } from "./format";
import type { ResumeListItem } from "./types";

async function errorMessage(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  return data.error || fallback;
}

export function ResumesTab() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeListItem[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [uploadFor, setUploadFor] = useState<ResumeListItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<ResumeListItem | null>(null);
  const [firstFile, setFirstFile] = useState<File | null>(null);

  useEffect(() => {
    fetch(`/api/resumes${showArchived ? "?archived=true" : ""}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error);
        setResumes(data.data.resumes);
      })
      .catch(() => toast.error("Couldn't load your resumes"));
  }, [showArchived, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  async function setArchived(resume: ResumeListItem, archived: boolean) {
    const res = await fetch(`/api/resumes/${resume.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !archived }),
    });
    if (!res.ok) return toast.error(await errorMessage(res, "Couldn't update the resume"));
    toast.success(archived ? `Archived ${resume.name}` : `Restored ${resume.name}`);
    reload();
  }

  async function remove(resume: ResumeListItem) {
    const res = await fetch(`/api/resumes/${resume.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await errorMessage(res, "Couldn't delete the resume"));
      throw new Error();
    }
    toast.success(`Deleted ${resume.name}`);
    reload();
  }

  const filtered = (resumes ?? []).filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.targetRole.toLowerCase().includes(q);
  });
  const archivedCount = (resumes ?? []).filter((r) => !r.isActive).length;

  if (resumes === null) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // First run: invite an upload right on the page
  if (resumes.length === 0 && !showArchived) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-6 text-center">
        <div>
          <p className="text-base font-medium">Add your first resume</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep each resume here with its full version history. Upload a new version whenever you
            update it, and pick which version each application uses.
          </p>
        </div>
        <FileDrop
          file={firstFile}
          onChange={(f) => {
            setFirstFile(f);
            if (f) setUploadFor("new");
          }}
        />
        <ResumeUploadDialog
          key={firstFile ? `${firstFile.name}-${firstFile.size}` : "empty"}
          initialFile={firstFile}
          open={uploadFor === "new"}
          onOpenChange={(o) => {
            if (!o) {
              setUploadFor(null);
              setFirstFile(null);
            }
          }}
          onDone={(data) => {
            const id = data.resume.id ?? data.resume._id;
            if (id) router.push(`/documents/resumes/${id}`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resumes"
            className="pl-9"
            aria-label="Search resumes"
          />
        </div>
        <Button onClick={() => setUploadFor("new")} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add resume
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {search ? "No resumes match your search." : "No resumes here."}
        </p>
      ) : (
        <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
          {filtered.map((r) => (
            <li
              key={r.id}
              className={cn(
                "relative flex items-center gap-3 p-4 hover:bg-muted/30",
                !r.isActive && "opacity-60"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/documents/resumes/${r.id}`}
                  className="font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none"
                >
                  {r.name}
                </Link>
                <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                  {r.targetRole && <span>{r.targetRole}</span>}
                  {r.current && (
                    <span>
                      v{r.current.versionNumber}, updated {formatDay(r.current.uploadedAt)}
                    </span>
                  )}
                  {r.applicationCount > 0 && (
                    <span className="sm:hidden">{`Used in ${r.applicationCount}`}</span>
                  )}
                  {!r.isActive && <span>Archived</span>}
                </p>
              </div>
              <div className="hidden shrink-0 text-right text-sm sm:block">
                <p>
                  {r.applicationCount === 0
                    ? "Not used yet"
                    : `Used in ${r.applicationCount} application${r.applicationCount === 1 ? "" : "s"}`}
                </p>
                {r.bestScore !== null && (
                  <p className="text-muted-foreground">Best match {r.bestScore}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative z-10 shrink-0"
                      aria-label={`Actions for ${r.name}`}
                    />
                  }
                >
                  <Ellipsis className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setUploadFor(r)}>
                    <Upload />
                    Upload new version
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/documents/resumes/${r.id}`)}>
                    <FileText />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setArchived(r, r.isActive)}>
                    {r.isActive ? <Archive /> : <ArchiveRestore />}
                    {r.isActive ? "Archive" : "Restore from archive"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleting(r)}>
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      {(archivedCount > 0 || showArchived) && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showArchived ? "Hide archived resumes" : "Show archived resumes"}
        </button>
      )}

      <ResumeUploadDialog
        open={uploadFor !== null}
        onOpenChange={(o) => !o && setUploadFor(null)}
        resume={
          uploadFor && uploadFor !== "new"
            ? {
                id: uploadFor.id,
                name: uploadFor.name,
                latestVersionNumber: uploadFor.latestVersionNumber,
              }
            : null
        }
        onDone={(data) => {
          const id = data.resume.id ?? data.resume._id;
          if (uploadFor === "new" && id) router.push(`/documents/resumes/${id}`);
          else reload();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description={`This deletes all ${deleting?.versionCount ?? 0} version${deleting?.versionCount === 1 ? "" : "s"} and removes it from applications that haven't been submitted. This can't be undone. To keep it, archive it instead.`}
        confirmLabel="Delete resume"
        onConfirm={() => remove(deleting!)}
      />
    </div>
  );
}
