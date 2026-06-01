"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { File, ArrowLeft, Download, Loader2, AlertCircle } from "lucide-react";
import { DocxViewer } from "@/components/ui/docx-viewer";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default function PreviewPage({ params }: RouteParams) {
  const router = useRouter();
  const { id } = use(params);

  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await fetch(`/api/files/${id}?metadata=true`);
        const data = await res.json();
        if (data.success) {
          setFile(data.data.file);
        } else {
          setError(data.error || "File not found");
        }
      } catch {
        setError("Failed to load file details");
      } finally {
        setLoading(false);
      }
    }
    fetchMetadata();
  }, [id]);

  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center p-6">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Error Loading Preview</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {error || "We couldn't retrieve the details for this file."}
        </p>
        <Button onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const fileType = file.fileType?.toLowerCase();
  const isPdf = fileType === ".pdf" || file.mimeType === "application/pdf";
  const isDocx = fileType === ".docx" || file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
              <File className="h-4 w-4 text-primary shrink-0" />
              {file.displayName}
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase">
              Category: {file.category} • Size: {formatBytes(file.fileSize)}
            </p>
          </div>
        </div>
        
        <a
          href={`/api/files/${id}`}
          download
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Download
        </a>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 min-h-0 bg-muted/5 relative">
        {isPdf ? (
          <iframe
            src={`/api/files/${id}`}
            className="w-full h-full border-0 bg-background"
            title={`Preview of ${file.displayName}`}
          />
        ) : isDocx ? (
          <DocxViewer fileId={id} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-background">
            <File className="h-12 w-12 text-primary/40 mb-2" />
            <p className="text-sm font-medium">Preview Not Supported</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              This file format is not supported for inline viewing. You can download the document to view it.
            </p>
            <div className="mt-4">
              <a
                href={`/api/files/${id}`}
                download
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download File
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
