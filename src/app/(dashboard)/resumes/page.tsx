"use client";

import Link from "next/link";

import { useEffect, useState, useCallback } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocxViewer } from "@/components/ui/docx-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  FileText,
  Trash2,
  ExternalLink,
  Target,
  FileDown,
  Eye,
} from "lucide-react";

interface FileItem {
  _id?: string;
  id?: string;
  displayName: string;
  fileType?: string;
  mimeType?: string;
}

interface ResumeVersion {
  _id?: string;
  id?: string;
  name: string;
  versionNumber: number;
  targetRole: string;
  targetIndustry: string;
  skillsEmphasized: string[];
  notes: string;
  isActive: boolean;
  fileId?: string | FileItem;
  createdAt: string;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
  }>({
    isOpen: false,
    id: "",
  });

  // New Resume state
  const [newResume, setNewResume] = useState({
    name: "",
    targetRole: "",
    targetIndustry: "",
    skillsRaw: "",
    notes: "",
    fileId: "",
  });

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes?sortBy=versionNumber&sortOrder=desc");
      const data = await res.json();
      if (data.success) {
        setResumes(data.data.resumes);
      }
    } catch {
      toast.error("Failed to load resumes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files?category=resume&limit=100");
      const data = await res.json();
      if (data.success) {
        setFiles(data.data.files);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchResumes();
    fetchFiles();
  }, [fetchResumes, fetchFiles]);

  async function handleCreateResume(e: React.FormEvent) {
    e.preventDefault();
    if (!newResume.name.trim()) return;
    setIsCreating(true);

    try {
      const skillsEmphasized = newResume.skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newResume.name,
          targetRole: newResume.targetRole,
          targetIndustry: newResume.targetIndustry,
          skillsEmphasized,
          notes: newResume.notes,
          fileId: newResume.fileId || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success("Resume version created");
      setShowNewDialog(false);
      setNewResume({
        name: "",
        targetRole: "",
        targetIndustry: "",
        skillsRaw: "",
        notes: "",
        fileId: "",
      });
      fetchResumes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsCreating(false);
    }
  }

  function requestDeleteResume(id: string) {
    setDeleteConfirm({ isOpen: true, id });
  }

  async function executeDeleteResume(id: string) {
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed");

      toast.success("Resume version deleted");
      fetchResumes();
    } catch {
      toast.error("Failed to delete resume");
    } finally {
      setDeleteConfirm({ isOpen: false, id: "" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume Library</h1>
          <p className="text-sm text-muted-foreground">
            Manage different versions and targeted variants of your resume.
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Resume Version
        </Button>
      </div>

      {/* Grid of resume variants */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : resumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-medium">No resume versions found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Create resume versions to associate specific templates or tailored keywords with your job search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card key={resume.id || resume._id} className="flex flex-col h-full border-border/60 hover:border-primary/20 transition-all">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">{resume.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      v{resume.versionNumber}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    Created: {new Date(resume.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => requestDeleteResume(resume.id || resume._id || "")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                {/* Target profile */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold uppercase">Targeting</span>
                  </div>
                  {resume.targetRole && (
                    <p className="font-medium text-xs">Role: {resume.targetRole}</p>
                  )}
                  {resume.targetIndustry && (
                    <p className="text-xs">Industry: {resume.targetIndustry}</p>
                  )}
                </div>

                {/* Skills section */}
                {resume.skillsEmphasized && resume.skillsEmphasized.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Emphasized Skills
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {resume.skillsEmphasized.map((s, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {resume.notes && (
                  <div className="text-xs text-muted-foreground flex-1">
                    <p className="line-clamp-3">{resume.notes}</p>
                  </div>
                )}

                {/* Preview/Download buttons */}
                <div className="pt-2 border-t border-border/50 flex gap-2">
                  <Link
                    href={`/resumes/${resume.id || resume._id}/preview`}
                    className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1 h-8 text-xs justify-center" })}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Preview
                  </Link>
                  {resume.fileId && (
                    <a
                      href={`/api/files/${
                        typeof resume.fileId === "object"
                          ? (resume.fileId?._id || resume.fileId?.id)
                          : resume.fileId
                      }`}
                      download
                      title="Download attached document"
                      className={buttonVariants({ variant: "outline", size: "icon", className: "h-8 w-8 shrink-0 justify-center" })}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Resume Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Resume Version</DialogTitle>
            <DialogDescription>
              Track a resume document version or targeted iteration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateResume} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="resume-name" className="text-sm font-semibold">
                Version Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resume-name"
                placeholder="e.g. Master Resume, Web Dev focus"
                value={newResume.name}
                onChange={(e) =>
                  setNewResume((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="target-role" className="text-sm font-semibold">Target Role</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                </div>
                <Input
                  id="target-role"
                  placeholder="e.g. Fullstack Engineer"
                  value={newResume.targetRole}
                  onChange={(e) =>
                    setNewResume((p) => ({ ...p, targetRole: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="target-industry" className="text-sm font-semibold">Industry</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                </div>
                <Input
                  id="target-industry"
                  placeholder="e.g. SaaS / Fintech"
                  value={newResume.targetIndustry}
                  onChange={(e) =>
                    setNewResume((p) => ({ ...p, targetIndustry: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <Label htmlFor="skills-raw" className="text-sm font-semibold">Emphasized Skills</Label>
                <span className="text-[10px] text-muted-foreground font-medium">Comma-separated</span>
              </div>
              <Input
                id="skills-raw"
                placeholder="e.g. React, TypeScript, Node.js"
                value={newResume.skillsRaw}
                onChange={(e) =>
                  setNewResume((p) => ({ ...p, skillsRaw: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <Label htmlFor="attached-file" className="text-sm font-semibold">Attach Document</Label>
                <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
              </div>
              <select
                id="attached-file"
                value={newResume.fileId}
                onChange={(e) =>
                  setNewResume((p) => ({ ...p, fileId: e.target.value }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Choose Document --</option>
                {files.map((f) => (
                  <option key={f.id || f._id} value={f.id || f._id}>
                    {f.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <Label htmlFor="resume-notes" className="text-sm font-semibold">Version Notes</Label>
                <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
              </div>
              <Textarea
                id="resume-notes"
                placeholder="What changes did you make in this version?"
                value={newResume.notes}
                onChange={(e) =>
                  setNewResume((p) => ({ ...p, notes: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Version
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.isOpen}
        onOpenChange={(isOpen) => setDeleteConfirm((prev) => ({ ...prev, isOpen }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete this resume version? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ isOpen: false, id: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => executeDeleteResume(deleteConfirm.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
