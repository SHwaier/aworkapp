"use client";

import { use, useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RouteParams {
  params: Promise<{ fileId: string }>;
}

export default function PrintPage({ params }: RouteParams) {
  const { fileId } = use(params);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAndPrint() {
      if (!containerRef.current) return;
      try {
        const response = await fetch(`/api/files/${fileId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch file");
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!active) return;

        const { renderAsync } = await import("docx-preview");

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          await renderAsync(arrayBuffer, containerRef.current, undefined, {
            className: "docx-rendered",
            inWrapper: false,
          });

          setLoading(false);

          // Wait a moment for layout/images to finish loading in DOM, then trigger print
          setTimeout(() => {
            if (active) {
              window.print();
            }
          }, 500);
        }
      } catch (err) {
        console.error("Print render error:", err);
        if (active) {
          setError("Failed to render document for printing.");
          setLoading(false);
        }
      }
    }

    loadAndPrint();

    return () => {
      active = false;
    };
  }, [fileId]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-900 text-black flex flex-col print:bg-white print:p-0">
      <style>{`
        /* Print-specific style overrides to isolate the resume document */
        @media print {
          body, html {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .docx-container {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .docx-container section.docx {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
        }

        /* Screen spacing for better layout */
        .docx-container section.docx {
          background: white !important;
          color: black !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
          border: 1px solid #e2e8f0 !important;
          margin: 2rem auto !important;
          box-sizing: border-box !important;
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
      `}</style>

      {/* Control bar - hidden during print */}
      <div className="no-print bg-white dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 px-4 py-3 sticky top-0 z-50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Print / Export to PDF</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={() => window.print()} disabled={loading}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print Document
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.close()}>
            <X className="mr-1.5 h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
        {loading && (
          <div className="no-print my-12 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparing document for PDF export...</p>
          </div>
        )}

        {error && (
          <div className="no-print my-12 flex flex-col items-center gap-3 text-center max-w-md bg-white dark:bg-zinc-800 p-6 rounded-lg border border-red-200 shadow-md">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="font-semibold text-red-600 dark:text-red-400">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        <div
          ref={containerRef}
          className="docx-container w-full max-w-[816px] print:w-full print:max-w-none"
        />
      </div>
    </div>
  );
}
