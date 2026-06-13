"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import "@eigenpal/docx-editor-react/styles.css";

// Dynamically import DocxEditor to prevent SSR issues (it requires browser DOM)
const DocxEditor = dynamic(
  () => import("@eigenpal/docx-editor-react").then((mod) => mod.DocxEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

interface DocxViewerProps {
  fileId: string;
}

export function DocxViewer({ fileId }: DocxViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docBuffer, setDocBuffer] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDoc() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/files/${fileId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch file");
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!active) return;

        setDocBuffer(arrayBuffer);
      } catch (err) {
        console.error("DOCX fetch error:", err);
        if (active) {
          setError("Failed to load DOCX document. Please download the file to view.");
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
    <div className="relative w-full h-full flex flex-col bg-muted/10 overflow-hidden">
      <style>{`
        /* Minimal overrides to make the editor fit perfectly as a viewer */
        .eigenpal-editor-container {
          height: 100% !important;
          border: none !important;
          background: transparent !important;
        }
        .eigenpal-toolbar {
          display: none !important; /* Hide toolbar for pure preview */
        }
        .eigenpal-page-wrapper {
          padding: 2rem 0 !important;
        }
      `}</style>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground bg-background">
          <AlertCircle className="h-10 w-10 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && docBuffer && (
        <div className="flex-1 overflow-hidden">
          <DocxEditor
            documentBuffer={docBuffer}
            mode="viewing"
            showToolbar={false}
          />
        </div>
      )}
    </div>
  );
}
