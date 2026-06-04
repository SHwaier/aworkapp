"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
  RotateCcw,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Building2,
  FileText,
  Briefcase,
  Lightbulb,
  CheckCircle2,
  ChevronsUpDown,
} from "lucide-react";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default function ResumeCustomizePage({ params }: RouteParams) {
  const router = useRouter();
  const { id: applicationId } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [editorHtml, setEditorHtml] = useState<string>("");
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadResumeContent() {
      try {
        const res = await fetch(`/api/applications/${applicationId}/resume/customize`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          setEditorHtml(result.data.html || "<p>Start writing your resume...</p>");
        } else {
          toast.error(result.error || "Failed to load resume contents");
          router.push(`/applications/${applicationId}`);
        }
      } catch (err) {
        toast.error("An error occurred loading resume");
        router.push(`/applications/${applicationId}`);
      } finally {
        setLoading(false);
      }
    }
    loadResumeContent();
  }, [applicationId, router]);

  // Handle document format command triggers
  const formatDoc = (command: string, value: string = "") => {
    if (typeof window !== "undefined") {
      document.execCommand(command, false, value);
      if (editorRef.current) {
        setEditorHtml(editorRef.current.innerHTML);
        setHasChanges(true);
      }
    }
  };

  // Sync editor content editable change
  const handleEditorInput = () => {
    if (editorRef.current) {
      setEditorHtml(editorRef.current.innerHTML);
      setHasChanges(true);
    }
  };

  const handleSave = async (redirectAfter = false) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/resume/customize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: editorHtml }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Resume saved successfully");
        setHasChanges(false);
        if (redirectAfter) {
          router.push(`/applications/${applicationId}`);
        }
      } else {
        toast.error(result.error || "Failed to save changes");
      }
    } catch {
      toast.error("Failed to save changes due to network error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to discard your edits and reset to the base resume version?")) {
      return;
    }
    setLoading(true);
    try {
      // Re-fetch base resume by unsetting customized file temporarily or refetching
      const res = await fetch(`/api/applications/${applicationId}/resume/customize`);
      const result = await res.json();
      if (result.success) {
        // Find existing snapshot
        const snapshotRes = await fetch(`/api/applications/${applicationId}/resume`);
        const snapshotData = await snapshotRes.json();
        if (snapshotData.success && snapshotData.data.resumeSnapshot) {
          const baseVersionId = snapshotData.data.resumeSnapshot.baseResumeVersionId?.id || snapshotData.data.resumeSnapshot.baseResumeVersionId;
          
          // Re-assign base resume which clears finalSubmittedFileId
          const assignRes = await fetch(`/api/applications/${applicationId}/resume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeVersionId: baseVersionId }),
          });
          const assignResult = await assignRes.json();
          
          if (assignResult.success) {
            // Refetch customization html
            const freshRes = await fetch(`/api/applications/${applicationId}/resume/customize`);
            const freshResult = await freshRes.json();
            if (freshResult.success) {
              setData(freshResult.data);
              setEditorHtml(freshResult.data.html);
              if (editorRef.current) {
                editorRef.current.innerHTML = freshResult.data.html;
              }
              setHasChanges(false);
              toast.success("Reset to base resume version successfully");
            }
          }
        }
      }
    } catch (err) {
      toast.error("Failed to reset resume");
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordInput.trim()) return;
    if (!customKeywords.includes(keywordInput.trim())) {
      setCustomKeywords([...customKeywords, keywordInput.trim()]);
    }
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setCustomKeywords(customKeywords.filter((k) => k !== kw));
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-[calc(100vh-6rem)] -m-4 sm:-m-6 bg-background overflow-hidden">
      {/* Custom styles to render contentEditable nicely inside the editor area */}
      <style>{`
        .resume-editable-area {
          font-family: 'Times New Roman', Times, serif;
          line-height: 1.5;
          font-size: 14px;
          color: #000;
          outline: none;
          min-height: 1056px; /* standard letter height ratio */
        }
        .resume-editable-area p {
          margin-bottom: 0.75rem;
        }
        .resume-editable-area h1,
        .resume-editable-area h2,
        .resume-editable-area h3,
        .resume-editable-area h4 {
          font-family: Arial, Helvetica, sans-serif;
          font-weight: bold;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: #111;
        }
        .resume-editable-area h1 { font-size: 24px; text-align: center; border-bottom: 2px solid #333; padding-bottom: 5px; }
        .resume-editable-area h2 { font-size: 18px; border-bottom: 1px solid #666; padding-bottom: 2px; }
        .resume-editable-area h3 { font-size: 15px; }
        .resume-editable-area ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .resume-editable-area ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .resume-editable-area li {
          margin-bottom: 0.25rem;
        }
        .resume-editable-area table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        .resume-editable-area th,
        .resume-editable-area td {
          border: 1px solid #ccc;
          padding: 8px;
          text-align: left;
        }
      `}</style>

      {/* Editor Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-border bg-card gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <Link
            href={`/applications/${applicationId}`}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "shrink-0" })}
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
              {data.companyName} • {data.jobTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-500/20 bg-amber-500/5 animate-pulse text-[10px] py-1">
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to Base
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save & Close
          </Button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex-grow flex flex-col md:flex-row min-h-0">
        {/* Left Side: Job Description Reference Panel */}
        <aside className="w-full md:w-[35%] border-r border-border bg-muted/10 p-5 overflow-y-auto space-y-6 hidden md:block shrink-0">
          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Briefcase className="h-4 w-4 text-primary" />
              Job Details
            </h3>
            <div className="text-xs space-y-1 bg-background p-4 rounded-xl border border-border/60">
              <p><span className="font-bold text-foreground">Role:</span> {data.jobTitle}</p>
              <p><span className="font-bold text-foreground">Company:</span> {data.companyName}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Lightbulb className="h-4 w-4 text-primary" />
              Tailoring Checklist
            </h3>
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-4">
                <form onSubmit={addKeyword} className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add target skill/keyword..."
                    className="flex-grow text-xs px-2.5 py-1.5 rounded-md border border-input bg-background outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button type="submit" size="sm" className="h-8">Add</Button>
                </form>

                <div className="flex flex-wrap gap-1.5">
                  {customKeywords.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">Add core keywords from the job description here to check them off as you inject them.</p>
                  )}
                  {customKeywords.map((kw, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-[10px] pl-2 pr-1 py-0.5 flex items-center gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
                      onClick={() => removeKeyword(kw)}
                    >
                      {kw}
                      <span className="font-bold text-[9px] opacity-60">×</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Job Description
            </h3>
            <Card className="border-border/60 bg-background max-h-[300px] overflow-y-auto">
              <CardContent className="p-4 text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {data.jobDescription || <span className="italic">No job description available for this application.</span>}
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Right Side: Document Editor */}
        <main className="flex-1 flex flex-col min-h-0 bg-muted/30">
          {/* Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 bg-card border-b border-border shadow-2xs shrink-0 select-none overflow-x-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatDoc("bold")}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatDoc("italic")}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatDoc("underline")}
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatDoc("justifyLeft")}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatDoc("justifyCenter")}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatDoc("justifyRight")}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatDoc("justifyFull")}
              title="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatDoc("insertUnorderedList")}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => formatDoc("insertOrderedList")}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <select
              onChange={(e) => formatDoc("formatBlock", e.target.value)}
              className="h-8 rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary max-w-[120px]"
              defaultValue="<p>"
            >
              <option value="<p>">Paragraph</option>
              <option value="<h1>">Heading 1</option>
              <option value="<h2>">Heading 2</option>
              <option value="<h3>">Heading 3</option>
            </select>
          </div>

          {/* Page Container */}
          <div className="flex-grow overflow-y-auto p-4 md:p-8 flex justify-center">
            {/* Sheet wrapper representing a page */}
            <div className="w-full max-w-[850px] min-h-[1100px] bg-white border border-border/80 shadow-md p-12 md:p-16 rounded-sm relative">
              <div
                ref={editorRef}
                className="resume-editable-area prose prose-sm max-w-none text-black select-text"
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                dangerouslySetInnerHTML={{ __html: editorHtml }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
