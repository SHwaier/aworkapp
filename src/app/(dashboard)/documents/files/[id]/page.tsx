"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Download, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ResumePreview } from "@/components/resume/resume-preview";
import { categoryLabel } from "@/components/documents/files-tab";
import { formatBytes, formatDay } from "@/components/documents/format";
import { cn } from "@/lib/utils";

interface FileMetadata {
  displayName: string;
  fileSize: number;
  category: string;
  createdAt: string;
  resumeId?: string | null;
}

export default function FilePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/files/${id}?metadata=true`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || "File not found");
        setFile(data.data.file);
      })
      .catch((err) => setError(err.message || "Couldn't load this file"));
  }, [id]);

  const back = file?.resumeId ? `/documents/resumes/${file.resumeId}` : "/documents?tab=files";

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">{error}</p>
        <Link
          href="/documents?tab=files"
          className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
        >
          Back to documents
        </Link>
      </div>
    );
  }
  if (!file) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-12">
      <Link
        href={back}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {file.resumeId ? "Resume" : "Documents"}
      </Link>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight break-words">{file.displayName}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            <span>{categoryLabel(file.category)}</span>
            <span>{formatBytes(file.fileSize)}</span>
            <span>Added {formatDay(file.createdAt)}</span>
          </p>
        </div>
        <a
          href={`/api/files/${id}`}
          className={cn(buttonVariants({ variant: "outline" }), "gap-1.5 self-start sm:self-auto")}
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>
      <div className="h-[75vh] overflow-hidden rounded-xl border border-border/70">
        <ResumePreview fileId={id} title={file.displayName} />
      </div>
    </div>
  );
}
