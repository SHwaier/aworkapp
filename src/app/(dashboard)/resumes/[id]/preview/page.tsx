"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowLeft, Download, Loader2, AlertCircle, Target } from "lucide-react";
import { DocxViewer } from "@/components/ui/docx-viewer";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default function ResumePreviewPage({ params }: RouteParams) {
  const router = useRouter();
  const { id } = use(params);

  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResumeDetails() {
      try {
        const res = await fetch(`/api/resumes/${id}`);
        const data = await res.json();
        if (data.success) {
          setResume(data.data.resume);
        } else {
          setError(data.error || "Resume version not found");
        }
      } catch {
        setError("Failed to load resume details");
      } finally {
        setLoading(false);
      }
    }
    fetchResumeDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center p-6">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Error Loading Preview</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {error || "We couldn't retrieve the details for this resume."}
        </p>
        <Button onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const file = typeof resume.fileId === "object" ? resume.fileId : null;
  const fileId = file?._id || file?.id || (typeof resume.fileId === "string" ? resume.fileId : null);
  const fileType = file?.fileType?.toLowerCase();
  const isPdf = fileType === ".pdf" || file?.mimeType === "application/pdf";
  const isDocx = fileType === ".docx" || file?.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] border border-border/60 rounded-md overflow-hidden bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/5">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              {resume.name}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              Version {resume.versionNumber} • Targeting {resume.targetRole || "Any Role"}
            </p>
          </div>
        </div>

        {fileId && (
          <a
            href={`/api/files/${fileId}`}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download Attached Document
          </a>
        )}
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Side: Resume Version Details */}
        <div className="w-80 border-r border-border/60 bg-muted/10 p-4 space-y-5 overflow-y-auto hidden md:block">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Target Profile</span>
            </div>
            <div className="text-xs space-y-1.5 bg-background p-3 rounded border border-border/40">
              <p><span className="font-semibold text-foreground">Role:</span> {resume.targetRole || "Not specified"}</p>
              <p><span className="font-semibold text-foreground">Industry:</span> {resume.targetIndustry || "Not specified"}</p>
            </div>
          </div>

          {resume.skillsEmphasized && resume.skillsEmphasized.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">
                Emphasized Skills
              </span>
              <div className="flex flex-wrap gap-1">
                {resume.skillsEmphasized.map((s: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {resume.notes && (
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">
                Version Notes
              </span>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-background p-3 rounded border border-border/40">
                {resume.notes}
              </p>
            </div>
          )}

          {file && (
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">
                Attached Document
              </span>
              <div className="text-xs text-muted-foreground space-y-1 bg-background p-3 rounded border border-border/40">
                <p className="truncate"><span className="font-semibold text-foreground">File:</span> {file.displayName}</p>
                <p><span className="font-semibold text-foreground">Type:</span> {file.fileType?.toUpperCase() || "Unknown"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Document Preview */}
        <div className="flex-1 bg-muted/5 flex flex-col min-h-0 relative">
          {!fileId ? (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-background">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">No document attached</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                This resume version does not have any attached document files to display.
              </p>
            </div>
          ) : isPdf ? (
            <iframe
              src={`/api/files/${fileId}`}
              className="w-full h-full border-0 bg-background"
              title={`Document Preview`}
            />
          ) : isDocx ? (
            <DocxViewer fileId={fileId} />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-background">
              <FileText className="h-12 w-12 text-primary/40 mb-2" />
              <p className="text-sm font-medium">Preview Not Supported</p>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                This document format cannot be rendered inline. Please use the download option in the top bar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
