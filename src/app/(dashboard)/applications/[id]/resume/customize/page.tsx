"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ResumeChecklist } from "@/components/resume-checklist/resume-checklist";
import type { DocxEditorRef } from "@eigenpal/docx-editor-react";
import "@eigenpal/docx-editor-react/styles.css";
import {
  ArrowLeft,
  Loader2,
  Save,
  RotateCcw,
  Building2,
  FileText,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
} from "lucide-react";

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

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ResumeData {
  fileId: string;
  manuallyEdited: boolean;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
}

export default function ResumeCustomizePage({ params }: RouteParams) {
  const router = useRouter();
  const { id: applicationId } = use(params);

  const editorRef = useRef<DocxEditorRef>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ResumeData | null>(null);
  const [docBuffer, setDocBuffer] = useState<ArrayBuffer | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Escape key exits maximized mode
  useEffect(() => {
    if (!isMaximized) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMaximized(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isMaximized]);

  // 1) Fetch metadata (fileId, jobTitle, etc.)
  // 2) Fetch the actual DOCX binary from /api/files/:fileId
  useEffect(() => {
    let active = true;

    async function loadResume() {
      try {
        // Step 1: Get metadata + fileId
        const metaRes = await fetch(`/api/applications/${applicationId}/resume/customize`);
        const metaResult = await metaRes.json();
        if (!metaResult.success) {
          toast.error(metaResult.error || "Failed to load resume");
          router.push(`/applications/${applicationId}`);
          return;
        }
        if (!active) return;
        setData(metaResult.data);

        // Step 2: Fetch the raw DOCX file as ArrayBuffer
        const fileRes = await fetch(`/api/files/${metaResult.data.fileId}`);
        if (!fileRes.ok) {
          toast.error("Failed to download resume file");
          router.push(`/applications/${applicationId}`);
          return;
        }
        const arrayBuffer = await fileRes.arrayBuffer();
        if (!active) return;
        setDocBuffer(arrayBuffer);
      } catch {
        if (active) {
          toast.error("An error occurred loading resume");
          router.push(`/applications/${applicationId}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResume();
    return () => {
      active = false;
    };
  }, [applicationId, router]);

  // Track changes via onChange (receives Document model, we just flag dirty)
  const handleEditorChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  const isSavingRef = useRef(false);

  // Save: use ref.save() to get the edited DOCX buffer, then upload as base64
  const handleSave = async (redirectAfter = false) => {
    if (!editorRef.current) {
      toast.error("Editor not ready");
      return;
    }

    setSaving(true);
    isSavingRef.current = true;
    try {
      // Get edited DOCX ArrayBuffer from the editor
      const buffer = await editorRef.current.save();
      if (!buffer) {
        toast.error("Failed to export document");
        setSaving(false);
        isSavingRef.current = false;
        return;
      }

      // Convert ArrayBuffer to base64
      const uint8 = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      const res = await fetch(`/api/applications/${applicationId}/resume/customize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Resume saved successfully", { id: "resume-save" });
        setHasChanges(false);
        if (redirectAfter) {
          router.push(`/applications/${applicationId}`);
        }
      } else {
        toast.error(result.error || "Failed to save changes", { id: "resume-save-err" });
      }
    } catch {
      toast.error("Failed to save changes due to network error", { id: "resume-save-err" });
    } finally {
      setSaving(false);
      // Give a tiny delay before unblocking editor's internal onSave to prevent race conditions
      setTimeout(() => {
        isSavingRef.current = false;
      }, 500);
    }
  };

  // Also handle Ctrl+S from within the editor's own save trigger
  const handleEditorSave = useCallback(
    (buffer: ArrayBuffer) => {
      // If a manual save from the header button is already processing, ignore this event
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      setSaving(true);

      // Convert and upload (fire-and-forget style, with toasts)
      const uint8 = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      fetch(`/api/applications/${applicationId}/resume/customize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            toast.success("Resume saved successfully", { id: "resume-save" });
            setHasChanges(false);
          } else {
            toast.error(result.error || "Failed to save changes", { id: "resume-save-err" });
          }
        })
        .catch(() => {
          toast.error("Failed to save changes due to network error", { id: "resume-save-err" });
        })
        .finally(() => {
          setSaving(false);
          setTimeout(() => {
            isSavingRef.current = false;
          }, 500);
        });
    },
    [applicationId]
  );

  // Reset: re-assign base resume version, then re-fetch
  const handleReset = async () => {
    if (
      !confirm("Are you sure you want to discard your edits and reset to the base resume version?")
    ) {
      return;
    }
    setLoading(true);
    try {
      const snapshotRes = await fetch(`/api/applications/${applicationId}/resume`);
      const snapshotData = await snapshotRes.json();
      if (snapshotData.success && snapshotData.data.resumeSnapshot) {
        const baseVersionId =
          snapshotData.data.resumeSnapshot.baseResumeVersionId?.id ||
          snapshotData.data.resumeSnapshot.baseResumeVersionId;

        const assignRes = await fetch(`/api/applications/${applicationId}/resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeVersionId: baseVersionId }),
        });
        const assignResult = await assignRes.json();

        if (assignResult.success) {
          // Re-fetch fresh metadata + file
          const freshMeta = await fetch(`/api/applications/${applicationId}/resume/customize`);
          const freshResult = await freshMeta.json();
          if (freshResult.success) {
            setData(freshResult.data);
            const fileRes = await fetch(`/api/files/${freshResult.data.fileId}`);
            if (fileRes.ok) {
              const arrayBuffer = await fileRes.arrayBuffer();
              setDocBuffer(arrayBuffer);
              setHasChanges(false);
              // Force re-mount of DocxEditor by changing key
              setEditorKey((k) => k + 1);
              toast.success("Reset to base resume version successfully");
            }
          }
        }
      }
    } catch {
      toast.error("Failed to reset resume");
    } finally {
      setLoading(false);
    }
  };

  // Extract plain text from the editor for checklist analysis
  const extractResumeText = useCallback(async (): Promise<string> => {
    if (!editorRef.current) return "";
    try {
      const buffer = await editorRef.current.save();
      if (!buffer) return "";
      // Decode the DOCX buffer to extract text content
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = zip.file("word/document.xml");
      if (!documentXml) return "";
      const rawText = await documentXml.async("text");
      // Strip XML tags to get plain text
      const plainText = rawText
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (plainText.length > 50) {
        setResumeText(plainText);
        return plainText;
      }
    } catch {
      // Silent — extraction is best-effort
    }
    return "";
  }, []);

  // Extract text after initial load
  useEffect(() => {
    if (docBuffer && !resumeText) {
      // Wait for editor to mount, then extract
      const timer = setTimeout(extractResumeText, 1500);
      return () => clearTimeout(timer);
    }
  }, [docBuffer, resumeText, extractResumeText]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-background overflow-hidden transition-all duration-200 ${
        isMaximized ? "fixed inset-0 z-50 h-screen" : "flex-1 min-h-0"
      }`}
    >
      {/* Isolate DocxEditor from Tailwind preflight resets and Dark Mode */}
      <style>{`
        /* 1. Force the eigenpal editor and any of its portals to use complete light-mode CSS variables */
        .docx-editor-isolation,
        .docx-editor-isolation *,
        .ep-root,
        div[data-radix-portal] .ep-root,
        div[data-radix-portal] .ep-root * {
          --background: 0 0% 100% !important;
          --foreground: 222.2 84% 4.9% !important;
          --card: 0 0% 100% !important;
          --card-foreground: 222.2 84% 4.9% !important;
          --popover: 0 0% 100% !important;
          --popover-foreground: 222.2 84% 4.9% !important;
          --primary: 221.2 83.2% 53.3% !important;
          --primary-foreground: 210 40% 98% !important;
          --secondary: 210 40% 96.1% !important;
          --secondary-foreground: 222.2 47.4% 11.2% !important;
          --muted: 210 40% 96.1% !important;
          --muted-foreground: 215.4 16.3% 46.9% !important;
          --accent: 210 40% 96.1% !important;
          --accent-foreground: 222.2 47.4% 11.2% !important;
          --destructive: 0 84.2% 60.2% !important;
          --destructive-foreground: 210 40% 98% !important;
          --border: 214.3 31.8% 91.4% !important;
          --input: 214.3 31.8% 91.4% !important;
          --ring: 221.2 83.2% 53.3% !important;
        }

        /* Force all elements to use dark text by default - this catches buttons/inputs that inherit the body's white color */
        .docx-editor-isolation,
        .ep-root {
          color: #1e293b !important;
        }

        .docx-editor-isolation .docx-editor-page {
          color: #000000;
          font-family: Calibri, Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.15;
          text-align: left;
        }

        /* 2. Reset box-sizing to browser defaults for document content only, leaving toolbar widgets intact */
        .docx-editor-isolation .docx-editor-page * {
          box-sizing: content-box;
        }

        /* 3. Revert Tailwind preflight overrides on tag selectors within the document pages */
        .docx-editor-isolation .docx-editor-page p,
        .docx-editor-isolation .docx-editor-page h1,
        .docx-editor-isolation .docx-editor-page h2,
        .docx-editor-isolation .docx-editor-page h3,
        .docx-editor-isolation .docx-editor-page h4,
        .docx-editor-isolation .docx-editor-page h5,
        .docx-editor-isolation .docx-editor-page h6,
        .docx-editor-isolation .docx-editor-page ul,
        .docx-editor-isolation .docx-editor-page ol,
        .docx-editor-isolation .docx-editor-page li,
        .docx-editor-isolation .docx-editor-page table,
        .docx-editor-isolation .docx-editor-page tr,
        .docx-editor-isolation .docx-editor-page td,
        .docx-editor-isolation .docx-editor-page th,
        .docx-editor-isolation .docx-editor-page span,
        .docx-editor-isolation .docx-editor-page a,
        .docx-editor-isolation .docx-editor-page b,
        .docx-editor-isolation .docx-editor-page i,
        .docx-editor-isolation .docx-editor-page u,
        .docx-editor-isolation .docx-editor-page strong,
        .docx-editor-isolation .docx-editor-page em,
        .docx-editor-isolation .docx-editor-page sub,
        .docx-editor-isolation .docx-editor-page sup {
          margin: 0;
          padding: 0;
          line-height: normal;
          border-width: revert;
          border-style: revert;
          border-color: revert;
          list-style: none; /* DOCX renders list bullet characters inline; disable native list-style to prevent duplicate markers */
        }

        /* 4. Fix image constraints inside the document canvas */
        .docx-editor-isolation .docx-editor-page img {
          max-width: none !important;
          display: inline;
        }
      `}</style>
      {/* Editor Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-border bg-card gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <Link
            href={`/applications/${applicationId}`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "shrink-0",
            })}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              Customizing Resume
            </h1>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {data?.companyName} • {data?.jobTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {hasChanges && (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-500/20 bg-amber-500/5 animate-pulse text-[10px] py-1"
            >
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMaximized((v) => !v)}
            title={isMaximized ? "Exit fullscreen (Esc)" : "Fullscreen editor"}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {!isMaximized && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarCollapsed((v) => !v)}
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              className="hidden md:inline-flex"
            >
              {sidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="mr-1.5 h-3.5 w-3.5" />
                  Show Panel
                </>
              ) : (
                <>
                  <PanelLeftClose className="mr-1.5 h-3.5 w-3.5" />
                  Hide Panel
                </>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to Base
          </Button>
          {data?.fileId && (
            <a
              href={`/api/files/${data.fileId}`}
              download
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </a>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save & Close
          </Button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="grow flex flex-col md:flex-row min-h-0">
        {/* Left Side: Resume Checklist Sidebar */}
        <aside
          className={`w-full md:w-[35%] max-w-sm border-r border-border bg-muted/10 p-5 overflow-y-auto shrink-0 transition-all duration-300 ${isMaximized || sidebarCollapsed ? "hidden" : "hidden md:block"}`}
        >
          <ResumeChecklist
            applicationId={applicationId}
            resumeText={resumeText}
            jobDescription={data?.jobDescription || ""}
            jobTitle={data?.jobTitle || ""}
            companyName={data?.companyName || ""}
            getResumeText={extractResumeText}
          />
        </aside>

        {/* Right Side: DOCX Editor */}
        <main className="flex-1 flex flex-col min-h-0 bg-white docx-editor-isolation relative overflow-hidden">
          {docBuffer ? (
            <div className="absolute inset-0 w-full h-full">
              <style>{`
                .docx-editor-isolation .eigenpal-editor-container {
                  width: 100% !important;
                  height: 100% !important;
                  border: none !important;
                  background: #f9fafb !important;
                }
                .docx-editor-isolation .eigenpal-page-wrapper {
                  padding: 2rem 0 !important;
                }
              `}</style>
              <DocxEditor
                key={editorKey}
                ref={editorRef}
                documentBuffer={docBuffer}
                mode="editing"
                onChange={handleEditorChange}
                onSave={handleEditorSave}
                showToolbar={true}
                showZoomControl={true}
                initialZoom={1.0}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
