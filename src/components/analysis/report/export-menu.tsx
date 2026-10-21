"use client";

import { toast } from "sonner";
import { ChevronDown, Copy, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  reportFileName,
  reportToMarkdown,
  type JobForExport,
} from "@/lib/ai/analysis/report-markdown";
import type { Analysis } from "../types";

/** Export the report as a brief for the user's own AI assistant. */
export function ExportMenu({
  analysis,
  job,
  applicationId,
}: {
  analysis: Analysis;
  job: JobForExport;
  applicationId: string;
}) {
  const markdown = () => reportToMarkdown(analysis, job);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown());
      toast.success("Report copied as Markdown");
    } catch {
      toast.error("Couldn't copy to the clipboard. Download the .md file instead.");
    }
  }

  function downloadMarkdown() {
    const url = URL.createObjectURL(
      new Blob([markdown()], { type: "text/markdown;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportFileName(job)}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Markdown downloaded");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="w-full gap-1.5 sm:w-auto" />}
      >
        <FileDown className="h-4 w-4" />
        Export
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={copyMarkdown}>
          <Copy />
          Copy as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadMarkdown}>
          <FileText />
          Download Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(`/print/analysis/${applicationId}`, "_blank")}>
          <FileDown />
          Save as PDF
        </DropdownMenuItem>
        <p className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">
          Give it to an AI assistant along with your resume and ask it to revise the resume for this
          job.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
