"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Ellipsis, File as FileIcon, Loader2, Plus, Search, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { FileDrop } from "./file-drop";
import { formatBytes, formatDay } from "./format";

/** Resumes have their own tab, so they aren't offered here */
export const OTHER_FILE_CATEGORIES = [
  { value: "cover-letter", label: "Cover letter" },
  { value: "transcript", label: "Transcript" },
  { value: "portfolio", label: "Portfolio" },
  { value: "certificate", label: "Certificate" },
  { value: "reference", label: "Reference" },
  { value: "other", label: "Other" },
] as const;

export function categoryLabel(value: string) {
  return OTHER_FILE_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

interface LibraryFile {
  _id: string;
  displayName: string;
  category: string;
  fileSize: number;
  createdAt: string;
}

async function errorMessage(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}));
  return data.error || fallback;
}

export function FilesTab() {
  const [files, setFiles] = useState<LibraryFile[] | null>(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<LibraryFile | null>(null);

  useEffect(() => {
    fetch("/api/files?limit=100&sortBy=createdAt&sortOrder=desc")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error);
        setFiles(data.data.files);
      })
      .catch(() => toast.error("Couldn't load your files"));
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  async function remove(file: LibraryFile) {
    const res = await fetch(`/api/files/${file._id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await errorMessage(res, "Couldn't delete the file"));
      throw new Error();
    }
    toast.success(`Deleted ${file.displayName}`);
    reload();
  }

  if (files === null) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const usedCategories = OTHER_FILE_CATEGORIES.filter((c) =>
    files.some((f) => f.category === c.value)
  );
  const q = search.trim().toLowerCase();
  const filtered = files.filter(
    (f) =>
      (category === "all" || f.category === category) &&
      (!q || f.displayName.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-4">
      {files.length === 0 ? (
        <div className="mx-auto max-w-lg space-y-3 py-6 text-center">
          <p className="text-base font-medium">Keep your other documents here</p>
          <p className="text-sm text-muted-foreground">
            Cover letters, transcripts, certificates, and references, ready when an application asks
            for them.
          </p>
          <Button onClick={() => setUploadOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Upload a file
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files"
                className="pl-9"
                aria-label="Search files"
              />
            </div>
            <Button onClick={() => setUploadOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Upload file
            </Button>
          </div>

          {usedCategories.length > 1 && (
            <div
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
              role="group"
              aria-label="Filter by type"
            >
              {[{ value: "all", label: "All" }, ...usedCategories].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  aria-pressed={category === c.value}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
                    category === c.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No files match.
            </p>
          ) : (
            <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
              {filtered.map((f) => (
                <li key={f._id} className="relative flex items-center gap-3 p-4 hover:bg-muted/30">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/documents/files/${f._id}`}
                      className="block truncate font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none"
                    >
                      {f.displayName}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      <span>{categoryLabel(f.category)}</span>
                      <span>{formatBytes(f.fileSize)}</span>
                      <span>Added {formatDay(f.createdAt)}</span>
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative z-10 shrink-0"
                          aria-label={`Actions for ${f.displayName}`}
                        />
                      }
                    >
                      <Ellipsis className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => (window.location.href = `/api/files/${f._id}`)}
                      >
                        <Download />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting(f)}>
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <FileUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onDone={reload} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.displayName}?`}
        description="The file is removed from your library. This can't be undone."
        confirmLabel="Delete file"
        onConfirm={() => remove(deleting!)}
      />
    </div>
  );
}

function FileUploadDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("cover-letter");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      const res = await fetch("/api/files", { method: "POST", body: form });
      if (!res.ok) throw new Error(await errorMessage(res, "Upload failed"));
      const data = await res.json();
      toast.success(data.data.duplicate ? "You already have this file" : "File uploaded");
      setFile(null);
      onOpenChange(false);
      onDone();
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
        if (busy) return;
        if (!o) setFile(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a file</DialogTitle>
          <DialogDescription>
            To add a resume, use the Resumes tab so it keeps a version history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FileDrop file={file} onChange={setFile} disabled={busy} />
          <div className="space-y-1.5">
            <Label htmlFor="file-category">Type</Label>
            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger id="file-category" className="w-full">
                <SelectValue>{categoryLabel(category)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {OTHER_FILE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={!file || busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload file
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
