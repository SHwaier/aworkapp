"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface DocxViewerProps {
  fileId: string;
}

export function DocxViewer({ fileId }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDoc() {
      if (!containerRef.current) return;
      setLoading(true);
      setError(null);
      containerRef.current.innerHTML = "";

      try {
        const response = await fetch(`/api/files/${fileId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch file");
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!active) return;

        // Dynamically import docx-preview client-side to prevent SSR environment conflicts
        const { renderAsync } = await import("docx-preview");

        if (containerRef.current) {
          await renderAsync(arrayBuffer, containerRef.current, undefined, {
            className: "docx-rendered",
            inWrapper: false,
          });
        }
      } catch (err) {
        console.error("DOCX render error:", err);
        if (active) {
          setError("Failed to render DOCX document. Please download the file to view.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDoc();

    return () => {
      active = false;
    };
  }, [fileId]);

  return (
    <div className="relative w-full h-full overflow-auto flex flex-col bg-white text-black p-4 md:p-8">
      <style>{`
        /* Make docx rendering responsive on all screens, especially mobile */
        .docx-container section.docx {
          width: 100% !important;
          max-width: 100% !important;
          padding: 2.5rem !important;
          margin: 0 auto 1.5rem auto !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
          border: 1px solid #e2e8f0 !important;
          box-sizing: border-box !important;
          height: auto !important;
          min-height: auto !important;
          color: #000000 !important;
          font-family: Calibri, Arial, sans-serif !important;
          line-height: 1.15 !important;
          text-align: left !important;
        }

        .docx-container section.docx * {
          box-sizing: content-box;
        }

        /* Scope styling isolation to prevent global preflight resets from breaking docx spacing */
        .docx-container section.docx p,
        .docx-container section.docx h1,
        .docx-container section.docx h2,
        .docx-container section.docx h3,
        .docx-container section.docx h4,
        .docx-container section.docx h5,
        .docx-container section.docx h6,
        .docx-container section.docx ul,
        .docx-container section.docx ol,
        .docx-container section.docx li,
        .docx-container section.docx table,
        .docx-container section.docx tr,
        .docx-container section.docx td,
        .docx-container section.docx th,
        .docx-container section.docx span,
        .docx-container section.docx a,
        .docx-container section.docx b,
        .docx-container section.docx i,
        .docx-container section.docx u,
        .docx-container section.docx strong,
        .docx-container section.docx em,
        .docx-container section.docx sub,
        .docx-container section.docx sup {
          margin: 0;
          padding: 0;
          line-height: normal;
          border-width: revert;
          border-style: revert;
          border-color: revert;
          list-style: none; /* Disable browser native lists as docx-preview handles list prefixes directly */
        }

        .docx-container section.docx img {
          max-width: none !important;
          display: inline;
        }

        @media (max-width: 640px) {
          .docx-container section.docx {
            padding: 1.5rem !important;
          }
        }
      `}</style>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-black/90 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground bg-background">
          <AlertCircle className="h-10 w-10 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      <div ref={containerRef} className="mx-auto max-w-[800px] w-full docx-container" />
    </div>
  );
}
