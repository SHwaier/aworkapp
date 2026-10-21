"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

const PDF_MIME = "application/pdf";

interface ResumePreviewProps {
  fileId: string;
  title?: string;
}

/**
 * Read-only preview for resume files. PDFs use the browser's built-in viewer
 * (via a blob: URL, since the files API serves downloads as attachments);
 * DOCX files are rendered to HTML with docx-preview.
 */
export function ResumePreview({ fileId, title = "Resume preview" }: ResumePreviewProps) {
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<"loading" | "pdf" | "docx" | "error">("loading");

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    fetch(`/api/files/${fileId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch file");
        const blob = await res.blob();
        if (!active) return;

        if ((res.headers.get("Content-Type") || blob.type).startsWith(PDF_MIME)) {
          objectUrl = URL.createObjectURL(new Blob([blob], { type: PDF_MIME }));
          setPdfUrl(objectUrl);
          setKind("pdf");
          return;
        }

        setKind("docx");
        const { renderAsync } = await import("docx-preview");
        if (!active || !docxContainerRef.current) return;
        docxContainerRef.current.innerHTML = "";
        await renderAsync(await blob.arrayBuffer(), docxContainerRef.current, undefined, {
          className: "docx-rendered",
          inWrapper: true,
        });
      })
      .catch((err) => {
        console.error("Resume preview error:", err);
        if (active) setKind("error");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted/10">
      {kind === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {kind === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive/70" />
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load a preview. Download the file to view it.
          </p>
        </div>
      )}

      {kind === "pdf" && pdfUrl && (
        <iframe src={pdfUrl} title={title} className="h-full w-full border-0 bg-background" />
      )}

      {/* Kept mounted while loading so docx-preview has a target to render into */}
      <div
        ref={docxContainerRef}
        className={kind === "docx" ? "h-full w-full overflow-auto" : "hidden"}
        aria-label={title}
      />
    </div>
  );
}
