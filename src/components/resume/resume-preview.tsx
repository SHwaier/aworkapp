"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PDF_MIME = "application/pdf";
/** docx-preview lays out tab stops 500ms after rendering (experimental option) */
const TAB_STOP_DELAY_MS = 600;

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
  /** Word pages stay hidden until tab stops are measured and the pages fitted */
  const [readyFileId, setReadyFileId] = useState<string | null>(null);
  const docxReady = readyFileId === fileId;

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
          // Lay out tab stops (right-aligned dates are tabs in most resumes);
          // without this every tab renders as one fixed-width space
          experimental: true,
        });
        // docx-preview measures tab stops on screen 500ms after rendering, so the
        // pages must still be at full size then; fit them to the width afterwards
        await new Promise((resolve) => setTimeout(resolve, TAB_STOP_DELAY_MS));
        if (!active || !docxContainerRef.current) return;
        fitDocxToWidth(docxContainerRef.current);
        setReadyFileId(fileId);
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

  // Keep Word pages fitted to the preview's width as it resizes
  useEffect(() => {
    const container = docxContainerRef.current;
    if (!docxReady || !container) return;
    const observer = new ResizeObserver(() => fitDocxToWidth(container));
    observer.observe(container);
    return () => observer.disconnect();
  }, [docxReady]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted/10">
      {(kind === "loading" || (kind === "docx" && !docxReady)) && (
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
        className={
          kind === "docx"
            ? cn(
                "docx-preview h-full w-full overflow-auto bg-muted p-3 sm:p-4",
                !docxReady && "invisible"
              )
            : "hidden"
        }
        aria-label={title}
      />
    </div>
  );
}

/**
 * Word pages render at their real size (e.g. 8.5in, about 816px wide). In a
 * narrower preview they'd overflow, and because they're centered the left edge
 * can't be scrolled to. Scale the pages down to the available width instead
 * (never up), using CSS zoom so the scroll height shrinks with them.
 */
function fitDocxToWidth(container: HTMLElement) {
  const wrapper = container.querySelector<HTMLElement>(".docx-rendered-wrapper");
  if (!wrapper) return;
  wrapper.style.zoom = "1";
  const pages = wrapper.querySelectorAll<HTMLElement>("section.docx-rendered");
  const pageWidth = Math.max(0, ...Array.from(pages, (p) => p.offsetWidth));
  if (!pageWidth) return;
  const styles = getComputedStyle(container);
  const available =
    container.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  wrapper.style.zoom = String(Math.min(1, available / pageWidth));
}
