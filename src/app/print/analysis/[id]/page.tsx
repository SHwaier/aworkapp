"use client";

import { use, useEffect, useState } from "react";
import { AlertCircle, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownView } from "@/components/analysis/report/markdown-view";
import { reportFileName, reportToMarkdown } from "@/lib/ai/analysis/report-markdown";
import type { Overview } from "@/components/analysis/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Print view of the resume match brief. Renders the same Markdown as the .md
 * export and opens the browser's print dialog, where "Save as PDF" makes the PDF.
 */
export default function PrintAnalysisPage({ params }: RouteParams) {
  const { id } = use(params);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/applications/${id}/analysis`).then((r) => r.json()),
      fetch(`/api/applications/${id}`).then((r) => r.json()),
    ])
      .then(([analysisRes, appRes]) => {
        if (!analysisRes.success || !appRes.success) throw new Error();
        const overview = analysisRes.data as Overview;
        const report =
          overview.analysis?.status === "complete" ? overview.analysis : overview.lastComplete;
        if (!report) {
          setError("There's no finished analysis to export yet.");
          return;
        }
        const app = appRes.data.application;
        const job = {
          title: app.jobTitle,
          company: app.companyId?.name || "",
          description: app.jobDescription || "",
        };
        document.title = reportFileName(job);
        setMarkdown(reportToMarkdown(report, job));
      })
      .catch(() => setError("The report couldn't be loaded."));
  }, [id]);

  // Open the print dialog once the brief has rendered
  useEffect(() => {
    if (!markdown) return;
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, [markdown]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 print:min-h-0">
      <style>{`
        @page { margin: 16mm; }
        @media print { .no-print { display: none !important; } }
        .brief { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; font-size: 14px; line-height: 1.6; }
        .brief h1 { font-size: 1.6rem; font-weight: 600; line-height: 1.25; margin: 0 0 0.75rem; }
        .brief h2 { font-size: 1.15rem; font-weight: 600; margin: 2rem 0 0.6rem; padding-bottom: 0.3rem; border-bottom: 1px solid #e5e5e5; break-after: avoid; }
        .brief h3 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.4rem; break-after: avoid; }
        .brief p { margin: 0.5rem 0; }
        .brief ul, .brief ol { margin: 0.5rem 0; padding-left: 1.4rem; }
        .brief ul { list-style: disc; } .brief ol { list-style: decimal; } .brief ul ul { list-style: circle; }
        .brief li { margin: 0.2rem 0; break-inside: avoid; }
        .brief table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 12.5px; }
        .brief th, .brief td { border: 1px solid #e5e5e5; padding: 0.4rem 0.55rem; text-align: left; vertical-align: top; }
        .brief th { background: #f5f5f5; font-weight: 600; }
        .brief tr { break-inside: avoid; }
        .brief pre { white-space: pre-wrap; background: #f7f7f7; border: 1px solid #e5e5e5; border-radius: 6px; padding: 0.75rem; font-size: 12px; }
      `}</style>

      {markdown && (
        <div className="no-print sticky top-0 border-b border-neutral-200 bg-white/95 px-4 py-2.5 backdrop-blur">
          <div className="mx-auto flex max-w-[46rem] items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">Choose “Save as PDF” in the print dialog.</p>
            <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print or save
            </Button>
          </div>
        </div>
      )}

      {!markdown && !error && (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      )}

      {error && (
        <div className="flex h-screen flex-col items-center justify-center gap-2 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <p className="text-sm text-neutral-600">{error}</p>
        </div>
      )}

      {markdown && (
        <article className="brief">
          <MarkdownView markdown={markdown} />
        </article>
      )}
    </div>
  );
}
