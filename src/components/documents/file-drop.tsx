"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "./format";

const ACCEPT = ".pdf,.docx";
const ALLOWED = [".pdf", ".docx"];

/** Drag-and-drop or click-to-choose for a single PDF/DOCX file. */
export function FileDrop({
  file,
  onChange,
  disabled,
  hint = "PDF or Word (.docx), up to 10 MB",
  compact,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  hint?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function pick(f: File | undefined) {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setError("Choose a PDF or Word (.docx) file.");
      return;
    }
    setError("");
    onChange(f);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <FileText className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "py-5" : "py-9",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
        )}
      >
        <UploadCloud
          className={cn("h-7 w-7", dragging ? "text-primary" : "text-muted-foreground")}
        />
        <span className="text-sm font-medium">
          Drop a file here or <span className="text-primary">choose one</span>
        </span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
