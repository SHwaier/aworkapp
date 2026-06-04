"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  FileText,
  History,
  Loader2,
  MapPin,
  Pin,
  Plus,
  Trash2,
  Pencil,
  Undo2,
  User,
  AlertCircle,
  File,
  UploadCloud,
  FileUp,
} from "lucide-react";
import { getStatusVariant } from "@/lib/utils/status";
import {
  APPLICATION_STATUSES,
  LIFECYCLE_STAGES,
  NOTE_TYPES,
  TIMELINE_EVENT_TYPES,
} from "@/lib/validators/schemas";
import { DocxViewer } from "@/components/ui/docx-viewer";

interface ApplicationDetails {
  id: string;
  jobTitle: string;
  jobDescription: string;
  jobUrl: string;
  applicationUrl: string;
  source: string;
  location: string;
  workMode: string;
  employmentType: string;
  seniorityLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  currentStatus: string;
  lifecycleStage: string;
  nextAction: string;
  nextActionDueAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  companyId: {
    id: string;
    name: string;
    website?: string;
    linkedinUrl?: string;
    location?: string;
  };
}

interface TimelineEvent {
  id: string;
  _id?: string;
  type: string;
  title: string;
  description: string;
  statusAfterEvent: string;
  lifecycleStageAfterEvent: string;
  eventDate: string;
  createdAt: string;
}

interface Note {
  id: string;
  _id?: string;
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

const NOTE_TYPE_THEMES: Record<string, {
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
}> = {
  "red-flag": {
    bg: "bg-red-500/5 dark:bg-red-950/20",
    border: "border-l-red-500 border-border dark:border-border/40 hover:border-l-red-600",
    badge: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300",
    badgeText: "Red Flag",
  },
  "rejection": {
    bg: "bg-red-500/5 dark:bg-red-950/20",
    border: "border-l-red-500 border-border dark:border-border/40 hover:border-l-red-600",
    badge: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300",
    badgeText: "Rejection",
  },
  "interview": {
    bg: "bg-blue-500/5 dark:bg-blue-950/20",
    border: "border-l-blue-500 border-border dark:border-border/40 hover:border-l-blue-600",
    badge: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
    badgeText: "Interview",
  },
  "prep": {
    bg: "bg-amber-500/5 dark:bg-amber-950/20",
    border: "border-l-amber-500 border-border dark:border-border/40 hover:border-l-amber-600",
    badge: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
    badgeText: "Prep",
  },
  "recruiter": {
    bg: "bg-purple-500/5 dark:bg-purple-950/20",
    border: "border-l-purple-500 border-border dark:border-border/40 hover:border-l-purple-600",
    badge: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300",
    badgeText: "Recruiter",
  },
  "salary": {
    bg: "bg-emerald-500/5 dark:bg-emerald-950/20",
    border: "border-l-emerald-500 border-border dark:border-border/40 hover:border-l-emerald-600",
    badge: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
    badgeText: "Salary",
  },
  "private": {
    bg: "bg-slate-500/5 dark:bg-slate-950/20",
    border: "border-l-slate-500 border-border dark:border-border/40 hover:border-l-slate-600",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    badgeText: "Private",
  },
  "general": {
    bg: "bg-card",
    border: "border-l-border border-border hover:border-l-border/80",
    badge: "bg-secondary text-secondary-foreground",
    badgeText: "General",
  },
};

const TIMELINE_EVENT_THEMES: Record<string, {
  dotBorder: string;
  dotBg: string;
  badge: string;
  bg?: string;
  border?: string;
}> = {
  rejection: {
    dotBorder: "border-red-500",
    dotBg: "bg-red-500",
    badge: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-500/20",
    bg: "bg-red-500/5 dark:bg-red-950/20",
    border: "border-red-500/20 dark:border-red-950/40",
  },
  offer: {
    dotBorder: "border-emerald-500",
    dotBg: "bg-emerald-500",
    badge: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    bg: "bg-emerald-500/5 dark:bg-emerald-950/20",
    border: "border-emerald-500/20 dark:border-emerald-950/40",
  },
  interview: {
    dotBorder: "border-blue-500",
    dotBg: "bg-blue-500",
    badge: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-500/20",
    bg: "bg-blue-500/5 dark:bg-blue-950/20",
    border: "border-blue-500/20 dark:border-blue-950/40",
  },
  screening: {
    dotBorder: "border-purple-500",
    dotBg: "bg-purple-500",
    badge: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-500/20",
    bg: "bg-purple-500/5 dark:bg-purple-950/20",
    border: "border-purple-500/20 dark:border-purple-950/40",
  },
  follow_up: {
    dotBorder: "border-amber-500",
    dotBg: "bg-amber-500",
    badge: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-500/20",
    bg: "bg-amber-500/5 dark:bg-amber-950/20",
    border: "border-amber-500/20 dark:border-amber-950/40",
  },
  reminder: {
    dotBorder: "border-amber-500",
    dotBg: "bg-amber-500",
    badge: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-500/20",
    bg: "bg-amber-500/5 dark:bg-amber-950/20",
    border: "border-amber-500/20 dark:border-amber-950/40",
  },
  application_submitted: {
    dotBorder: "border-indigo-500",
    dotBg: "bg-indigo-500",
    badge: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    bg: "bg-indigo-500/5 dark:bg-indigo-950/20",
    border: "border-indigo-500/20 dark:border-indigo-950/40",
  },
  document_submitted: {
    dotBorder: "border-sky-500",
    dotBg: "bg-sky-500",
    badge: "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-500/20",
    bg: "bg-sky-500/5 dark:bg-sky-950/20",
    border: "border-sky-500/20 dark:border-sky-950/40",
  },
  status_change: {
    dotBorder: "border-primary",
    dotBg: "bg-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  note: {
    dotBorder: "border-slate-500",
    dotBg: "bg-slate-500",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  custom: {
    dotBorder: "border-teal-500",
    dotBg: "bg-teal-500",
    badge: "bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-500/20",
  },
};

import { LocationAutocomplete } from "@/components/ui/location-autocomplete";


export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const applicationId = resolvedParams.id;

  // Edit details states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [editCompanySearchText, setEditCompanySearchText] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const editCompanyRef = useRef<HTMLDivElement>(null);
  const [focusedEditCompanyIndex, setFocusedEditCompanyIndex] = useState(-1);

  const [editDetailsForm, setEditDetailsForm] = useState({
    jobTitle: "",
    jobUrl: "",
    location: "",
    workMode: "",
    employmentType: "",
    source: "",
    seniorityLevel: "",
    salaryMin: "" as string | number,
    salaryMax: "" as string | number,
    currency: "USD",
    jobDescription: "",
  });

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies?limit=100");
      const data = await res.json();
      if (data.success) setCompanies(data.data.companies);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (editCompanyRef.current && !editCompanyRef.current.contains(e.target as Node)) {
        setShowEditSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const editFilteredSuggestions = editCompanySearchText.trim()
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(editCompanySearchText.toLowerCase())
      )
    : companies;

  const [app, setApp] = useState<ApplicationDetails | null>(null);

  const openEditDialog = useCallback(() => {
    if (!app) return;
    setEditDetailsForm({
      jobTitle: app.jobTitle || "",
      jobUrl: app.jobUrl || "",
      location: app.location || "",
      workMode: app.workMode || "",
      employmentType: app.employmentType || "",
      source: app.source || "Other",
      seniorityLevel: app.seniorityLevel || "",
      salaryMin: app.salaryMin !== null && app.salaryMin !== undefined ? app.salaryMin : "",
      salaryMax: app.salaryMax !== null && app.salaryMax !== undefined ? app.salaryMax : "",
      currency: app.currency || "USD",
      jobDescription: app.jobDescription || "",
    });
    setEditCompanySearchText(app.companyId?.name || "");
    setEditCompanyId(app.companyId?.id || "");
    setIsEditDialogOpen(true);
  }, [app]);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "note" | "timeline" | "application";
    id?: string;
  }>({
    isOpen: false,
    type: "note",
    id: undefined,
  });

  // Resume states
  const [resumeSnapshot, setResumeSnapshot] = useState<any | null>(null);
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [isFetchingResume, setIsFetchingResume] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [isAssigningResume, setIsAssigningResume] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit status/next action state
  const [editStatus, setEditStatus] = useState({
    currentStatus: "",
    lifecycleStage: "",
    nextAction: "",
    nextActionDueAt: "",
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Add note state
  const [noteForm, setNoteForm] = useState({
    type: "general",
    title: "",
    body: "",
  });
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Add timeline event state
  const [timelineForm, setTimelineForm] = useState({
    type: "status_change",
    title: "",
    description: "",
    eventDate: new Date().toISOString().split("T")[0],
    statusAfterEvent: "",
    lifecycleStageAfterEvent: "",
  });
  const [isAddingTimeline, setIsAddingTimeline] = useState(false);

  // Edit timeline event state
  const [editingTimelineEvent, setEditingTimelineEvent] = useState<any | null>(null);
  const [editTimelineForm, setEditTimelineForm] = useState({
    type: "status_change",
    title: "",
    description: "",
    eventDate: "",
    statusAfterEvent: "",
    lifecycleStageAfterEvent: "",
  });
  const [isUpdatingTimeline, setIsUpdatingTimeline] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      const data = await res.json();
      if (data.success) {
        setApp(data.data.application);
        setTimeline(data.data.timeline || []);
        setNotes(data.data.notes || []);

        setEditStatus({
          currentStatus: data.data.application.currentStatus || "",
          lifecycleStage: data.data.application.lifecycleStage || "",
          nextAction: data.data.application.nextAction || "",
          nextActionDueAt: data.data.application.nextActionDueAt
            ? new Date(data.data.application.nextActionDueAt).toISOString().split("T")[0]
            : "",
        });
      } else {
        toast.error(data.error || "Failed to load application details");
        router.push("/applications");
      }
    } catch {
      toast.error("Failed to load application details");
      router.push("/applications");
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, router]);

  const fetchResumeInfo = useCallback(async () => {
    setIsFetchingResume(true);
    try {
      const snapshotRes = await fetch(`/api/applications/${applicationId}/resume`);
      const snapshotData = await snapshotRes.json();
      if (snapshotData.success) {
        setResumeSnapshot(snapshotData.data.resumeSnapshot);
        if (snapshotData.data.resumeSnapshot) {
          const baseVersion = snapshotData.data.resumeSnapshot.baseResumeVersionId;
          const resolvedId = typeof baseVersion === "object" && baseVersion
            ? (baseVersion.id || baseVersion._id?.toString?.() || baseVersion._id || "")
            : (baseVersion?.toString?.() || "");
          setSelectedResumeId(String(resolvedId));
        }
      }
      
      const resumesRes = await fetch(`/api/resumes?active=true`);
      const resumesData = await resumesRes.json();
      if (resumesData.success) {
        setUserResumes(resumesData.data.resumes || []);
      }
    } catch (err) {
      console.error("Error fetching resume snapshot:", err);
    } finally {
      setIsFetchingResume(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchDetails();
    fetchResumeInfo();
  }, [fetchDetails, fetchResumeInfo]);

  async function handleAssignResume(resumeId: string) {
    if (!resumeId) return;
    setIsAssigningResume(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeVersionId: resumeId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Resume assigned to application");
        fetchResumeInfo();
      } else {
        toast.error(data.error || "Failed to assign resume");
      }
    } catch {
      toast.error("Failed to assign resume");
    } finally {
      setIsAssigningResume(false);
    }
  }

  async function handleUploadAndAssignResume(file: globalThis.File) {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") {
      toast.error("Only PDF and DOCX files are allowed");
      return;
    }
    setIsAssigningResume(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/applications/${applicationId}/resume/upload-assign`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Resume uploaded and assigned successfully!");
        fetchResumeInfo();
        fetchDetails();
      } else {
        toast.error(data.error || "Failed to upload and assign resume");
      }
    } catch {
      toast.error("Failed to upload and assign resume");
    } finally {
      setIsAssigningResume(false);
    }
  }

  async function handleUnassignResume() {
    if (!confirm("Are you sure you want to unassign this resume from the application? Any customized changes will be permanently deleted.")) {
      return;
    }
    try {
      const res = await fetch(`/api/applications/${applicationId}/resume`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Resume unassigned");
        setResumeSnapshot(null);
        setSelectedResumeId("");
        fetchResumeInfo();
      } else {
        toast.error(data.error || "Failed to unassign resume");
      }
    } catch {
      toast.error("Failed to unassign resume");
    }
  }

  async function handleUpdateDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!editDetailsForm.jobTitle.trim() || !editCompanySearchText.trim()) {
      toast.error("Job title and Company name are required");
      return;
    }
    setIsUpdatingDetails(true);

    try {
      let finalCompanyId = editCompanyId;
      // Create company if needed
      if (!finalCompanyId && editCompanySearchText.trim()) {
        const match = companies.find(
          (c) => c.name.toLowerCase() === editCompanySearchText.trim().toLowerCase()
        );
        if (match) {
          finalCompanyId = match.id || match._id || "";
        } else {
          const compRes = await fetch("/api/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: editCompanySearchText.trim() }),
          });
          const compData = await compRes.json();
          if (!compRes.ok) throw new Error(compData.error);
          finalCompanyId = compData.data.company.id || compData.data.company._id || "";
        }
      }

      if (!finalCompanyId) {
        toast.error("Please select or type a company");
        setIsUpdatingDetails(false);
        return;
      }

      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: editDetailsForm.jobTitle.trim(),
          companyId: finalCompanyId,
          jobUrl: editDetailsForm.jobUrl.trim() || "",
          location: editDetailsForm.location.trim() || "",
          workMode: editDetailsForm.workMode || "",
          employmentType: editDetailsForm.employmentType || "",
          source: editDetailsForm.source || "Other",
          seniorityLevel: editDetailsForm.seniorityLevel.trim() || "",
          salaryMin: editDetailsForm.salaryMin !== "" ? Number(editDetailsForm.salaryMin) : null,
          salaryMax: editDetailsForm.salaryMax !== "" ? Number(editDetailsForm.salaryMax) : null,
          currency: editDetailsForm.currency || "USD",
          jobDescription: editDetailsForm.jobDescription || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Application details updated successfully! ✨");
      setIsEditDialogOpen(false);
      fetchDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update details");
    } finally {
      setIsUpdatingDetails(false);
    }
  }

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStatus: editStatus.currentStatus,
          lifecycleStage: editStatus.lifecycleStage,
          nextAction: editStatus.nextAction,
          nextActionDueAt: editStatus.nextActionDueAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Application status updated");
      fetchDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteForm.body.trim()) return;
    setIsAddingNote(true);

    try {
      const res = await fetch(`/api/applications/${applicationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Note added");
      setNoteForm({ type: "general", title: "", body: "" });
      fetchDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setIsAddingNote(false);
    }
  }

  async function handlePinNote(noteId: string, currentlyPinned: boolean) {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !currentlyPinned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchDetails();
    } catch (err) {
      toast.error("Failed to toggle pin state");
    }
  }

  function requestDeleteNote(noteId: string) {
    setDeleteConfirm({ isOpen: true, type: "note", id: noteId });
  }

  async function executeDeleteNote(noteId: string) {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Note deleted");
      fetchDetails();
    } catch (err) {
      toast.error("Failed to delete note");
    } finally {
      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
    }
  }

  async function handleAddTimeline(e: React.FormEvent) {
    e.preventDefault();
    if (!timelineForm.title.trim()) return;
    setIsAddingTimeline(true);

    try {
      const res = await fetch(`/api/applications/${applicationId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...timelineForm,
          statusAfterEvent: timelineForm.statusAfterEvent || undefined,
          lifecycleStageAfterEvent: timelineForm.lifecycleStageAfterEvent || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Timeline event added");
      setTimelineForm({
        type: "status_change",
        title: "",
        description: "",
        eventDate: new Date().toISOString().split("T")[0],
        statusAfterEvent: "",
        lifecycleStageAfterEvent: "",
      });
      fetchDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add event");
    } finally {
      setIsAddingTimeline(false);
    }
  }

  function startEditTimeline(event: any) {
    setEditingTimelineEvent(event);
    setEditTimelineForm({
      type: event.type || "status_change",
      title: event.title || "",
      description: event.description || "",
      eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split("T")[0] : "",
      statusAfterEvent: event.statusAfterEvent || "none",
      lifecycleStageAfterEvent: event.lifecycleStageAfterEvent || "none",
    });
  }

  async function handleUpdateTimeline(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTimelineEvent) return;
    if (!editTimelineForm.title.trim()) return;
    setIsUpdatingTimeline(true);

    try {
      const res = await fetch(`/api/timeline/${editingTimelineEvent._id || editingTimelineEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editTimelineForm,
          statusAfterEvent: editTimelineForm.statusAfterEvent === "none" ? null : editTimelineForm.statusAfterEvent,
          lifecycleStageAfterEvent: editTimelineForm.lifecycleStageAfterEvent === "none" ? null : editTimelineForm.lifecycleStageAfterEvent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Timeline event updated");
      setEditingTimelineEvent(null);
      fetchDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setIsUpdatingTimeline(false);
    }
  }

  function requestDeleteTimeline(eventId: string) {
    setDeleteConfirm({ isOpen: true, type: "timeline", id: eventId });
  }

  async function executeDeleteTimeline(eventId: string) {
    try {
      const res = await fetch(`/api/timeline/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Timeline event deleted");
      fetchDetails();
    } catch (err) {
      toast.error("Failed to delete event");
    } finally {
      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
    }
  }

  function requestDeleteApplication() {
    setDeleteConfirm({ isOpen: true, type: "application" });
  }

  async function executeDeleteApplication() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Application deleted successfully");
      router.push("/applications");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete application");
      setIsDeleting(false);
    } finally {
      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!app) return null;

  return (
    <div className="space-y-6 max-w-full px-1 sm:px-2">
      {/* Back and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <Link
          href="/applications"
          className={buttonVariants({ variant: "ghost", className: "pl-0 text-muted-foreground hover:text-foreground self-start" })}
        >
          <Undo2 className="mr-2 h-4 w-4" />
          Back to applications
        </Link>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={openEditDialog}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Details
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={requestDeleteApplication}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Application
          </Button>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="pb-6 border-b border-border/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight wrap-break-word text-foreground">
              {app.jobTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Link href={`/companies/${app.companyId.id}`} className="hover:underline hover:text-primary transition-colors wrap-break-word">
                  {app.companyId.name}
                </Link>
              </span>
              {app.location && (
                <span className="flex items-center gap-1.5 wrap-break-word">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{app.location}</span>
                </span>
              )}
              {app.workMode && (
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 bg-muted/30">
                  {app.workMode}
                </Badge>
              )}
              {app.employmentType && (
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 bg-muted/30">
                  {app.employmentType}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <div className="text-left lg:text-right">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Current Status</span>
              <Badge variant={getStatusVariant(app.currentStatus)} className="text-xs font-semibold mt-1 px-2.5 py-0.5 uppercase tracking-wide">
                {app.currentStatus}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-8 mx-1 hidden lg:block" />
            <div className="text-left lg:text-right">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Lifecycle Stage</span>
              <Badge variant="outline" className="text-xs font-semibold mt-1 px-2.5 py-0.5 uppercase tracking-wide bg-muted/10">
                {app.lifecycleStage}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid gap-4 mt-6 grid-cols-2 md:grid-cols-4 bg-muted/20 dark:bg-muted/5 p-4 rounded-xl border border-border/40">
          <div className="space-y-0.5 min-w-0">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Source</span>
            <span className="text-sm font-semibold mt-0.5 block wrap-break-word">{app.source || "—"}</span>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Seniority</span>
            <span className="text-sm font-semibold mt-0.5 block wrap-break-word">{app.seniorityLevel || "—"}</span>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Salary Range</span>
            <span className="text-sm font-semibold mt-0.5 block wrap-break-word">
              {app.salaryMin !== null || app.salaryMax !== null
                ? `${app.salaryMin ? `${app.currency} ${app.salaryMin.toLocaleString()}` : "—"} to ${
                    app.salaryMax ? `${app.currency} ${app.salaryMax.toLocaleString()}` : "—"
                  }`
                : "—"}
            </span>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Applied Date</span>
            <span className="text-sm font-semibold mt-0.5 block whitespace-nowrap">
              {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column (Timeline, Notes, Job Description) */}
        <div className="w-full lg:w-2/3 space-y-6 min-w-0">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList variant="line" className="flex w-full justify-start border-b border-border/60 bg-transparent p-0 rounded-none h-12 gap-4 sm:gap-6 mb-6 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden shrink-0">
              <TabsTrigger
                value="timeline"
                className="flex-none rounded-none bg-transparent px-4 sm:px-6 text-sm font-semibold text-muted-foreground hover:text-foreground data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary after:bottom-0 transition-all"
              >
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex-none rounded-none bg-transparent px-4 sm:px-6 text-sm font-semibold text-muted-foreground hover:text-foreground data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary after:bottom-0 transition-all flex items-center gap-1.5"
              >
                Notes
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                  {notes.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="description"
                className="flex-none rounded-none bg-transparent px-4 sm:px-6 text-sm font-semibold text-muted-foreground hover:text-foreground data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary after:bottom-0 transition-all"
              >
                Job Description
              </TabsTrigger>
              <TabsTrigger
                value="resume"
                className="flex-none rounded-none bg-transparent px-4 sm:px-6 text-sm font-semibold text-muted-foreground hover:text-foreground data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary after:bottom-0 transition-all flex items-center gap-1.5"
              >
                Resume
                {resumeSnapshot && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Application History</h3>
                <Dialog>
                  <DialogTrigger render={<Button size="sm" variant="outline" />}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Event
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Timeline Event</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddTimeline} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="event-title">Event Title *</Label>
                        <Input
                          id="event-title"
                          placeholder="e.g. Call with recruiter, Technical round"
                          value={timelineForm.title}
                          onChange={(e) =>
                            setTimelineForm((p) => ({ ...p, title: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="event-type">Event Type</Label>
                          <Select
                            value={timelineForm.type}
                            onValueChange={(v) => setTimelineForm((p) => ({ ...p, type: v || "" }))}
                          >
                            <SelectTrigger id="event-type">
                              <SelectValue>
                                {timelineForm.type ? timelineForm.type.replace("_", " ").toUpperCase() : ""}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {TIMELINE_EVENT_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t.replace("_", " ").toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 flex flex-col">
                          <Label htmlFor="event-date">Event Date</Label>
                          <Popover>
                            <PopoverTrigger
                              render={
                                <Button
                                  id="event-date"
                                  variant="outline"
                                  className={cn(
                                    "w-full h-9 justify-start text-left font-normal px-3 py-1.5 text-sm border-border/60",
                                    !timelineForm.eventDate && "text-muted-foreground"
                                  )}
                                />
                              }
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              {timelineForm.eventDate ? (
                                format(new Date(timelineForm.eventDate + "T00:00:00"), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-popover border border-border rounded-md shadow-md" align="start">
                              <Calendar
                                mode="single"
                                selected={timelineForm.eventDate ? new Date(timelineForm.eventDate + "T00:00:00") : undefined}
                                onSelect={(date) => {
                                  setTimelineForm((p) => ({
                                    ...p,
                                    eventDate: date ? date.toISOString().split("T")[0] : "",
                                  }));
                                }}
                                autoFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="status-after">Update Status</Label>
                          <Select
                            value={timelineForm.statusAfterEvent}
                            onValueChange={(v) =>
                              setTimelineForm((p) => ({ ...p, statusAfterEvent: v || "" }))
                            }
                          >
                            <SelectTrigger id="status-after">
                              <SelectValue>
                                {timelineForm.statusAfterEvent === "none" ? "Keep current" : timelineForm.statusAfterEvent || "Keep current"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Keep current</SelectItem>
                              {APPLICATION_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lifecycle-after">Update Lifecycle</Label>
                          <Select
                            value={timelineForm.lifecycleStageAfterEvent}
                            onValueChange={(v) =>
                              setTimelineForm((p) => ({ ...p, lifecycleStageAfterEvent: v || "" }))
                            }
                          >
                            <SelectTrigger id="lifecycle-after">
                              <SelectValue>
                                {timelineForm.lifecycleStageAfterEvent === "none" ? "Keep current" : timelineForm.lifecycleStageAfterEvent || "Keep current"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Keep current</SelectItem>
                              {LIFECYCLE_STAGES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="event-description">Description / Notes</Label>
                        <Textarea
                          id="event-description"
                          placeholder="Add details about what happened, questions asked, etc."
                          value={timelineForm.description}
                          onChange={(e) =>
                            setTimelineForm((p) => ({ ...p, description: e.target.value }))
                          }
                          rows={3}
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={isAddingTimeline}>
                        {isAddingTimeline && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Event
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {timeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
                  <History className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium">No timeline events yet</p>
                </div>
              ) : (
                <div className="relative border-l border-border pl-6 ml-3 space-y-6">
                  {timeline.map((event) => {
                    const theme = TIMELINE_EVENT_THEMES[event.type] || TIMELINE_EVENT_THEMES["custom"];
                    return (
                      <div key={event._id || event.id} className="relative group">
                        {/* Timeline dot */}
                        <span className={cn("absolute left-[-31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 transition-colors", theme.dotBorder)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full transition-colors", theme.dotBg)} />
                        </span>

                        <div className={cn("space-y-3 p-4 rounded-xl border bg-card text-card-foreground shadow-xs transition-all duration-200", theme.border || "border-border/40")}>
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-foreground wrap-break-word leading-tight">
                                {event.title}
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                <Badge className={cn("text-[10px] py-0.5 px-1.5 h-auto uppercase border font-semibold", theme.badge)}>
                                  {event.type.replace("_", " ")}
                                </Badge>
                                {event.statusAfterEvent && (
                                  <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 h-auto">
                                    Status: {event.statusAfterEvent}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(event.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEditTimeline(event)}
                                  className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-all sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center"
                                  aria-label="Edit event"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => requestDeleteTimeline(event._id || event.id)}
                                  className="text-muted-foreground hover:text-destructive p-1 hover:bg-muted rounded transition-all sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center"
                                  aria-label="Delete event"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {event.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word leading-relaxed border-t border-border/20 pt-2 mt-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4 pt-4">
              {/* Add Note Form */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-bold">Add Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="note-type" className="text-xs">Category</Label>
                      <Select
                        value={noteForm.type}
                        onValueChange={(v) => setNoteForm((p) => ({ ...p, type: v || "" }))}
                      >
                        <SelectTrigger id="note-type" className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NOTE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="note-title" className="text-xs">Title (Optional)</Label>
                      <Input
                        id="note-title"
                        placeholder="e.g. Interview preparation"
                        value={noteForm.title}
                        onChange={(e) => setNoteForm((p) => ({ ...p, title: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Textarea
                      placeholder="Write your note here..."
                      value={noteForm.body}
                      onChange={(e) => setNoteForm((p) => ({ ...p, body: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleAddNote} disabled={isAddingNote}>
                      {isAddingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Note
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notes List */}
              <div className="space-y-3">
                {notes.map((note) => {
                  const theme = NOTE_TYPE_THEMES[note.type] || NOTE_TYPE_THEMES["general"];
                  return (
                    <Card key={note._id || note.id} className={cn("border-l-4 transition-all duration-200", theme.border, theme.bg, note.pinned && "ring-1 ring-primary/20")}>
                      <CardHeader className="flex flex-row items-start justify-between py-3">
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase border shrink-0", theme.badge)}>
                              {theme.badgeText}
                            </span>
                            {note.title && <h4 className="font-semibold text-sm wrap-break-word">{note.title}</h4>}
                            {note.pinned && <Pin className="h-3 w-3 fill-primary text-primary shrink-0" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-1">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handlePinNote(note._id || note.id, note.pinned)}
                          >
                            <Pin className={cn("h-3.5 w-3.5", note.pinned && "fill-primary text-primary")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => requestDeleteNote(note._id || note.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3 pt-0">
                        <p className="text-sm whitespace-pre-wrap wrap-break-word text-foreground/80 leading-relaxed">{note.body}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Description Tab */}
            <TabsContent value="description" className="pt-4">
              <Card>
                <CardContent className="p-4 whitespace-pre-wrap text-sm text-foreground/80 wrap-break-word leading-relaxed">
                  {app.jobDescription || (
                    <span className="text-muted-foreground italic">No job description provided.</span>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Resume Tab */}
            <TabsContent value="resume" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Assigned Resume</h3>
                {resumeSnapshot && (
                  <Button variant="destructive" size="sm" onClick={handleUnassignResume}>
                    Unassign Resume
                  </Button>
                )}
              </div>

              {isFetchingResume ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !resumeSnapshot ? (
                <Card 
                  className={cn(
                    "border-2 border-dashed transition-all duration-300",
                    isDragging 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border/80 hover:border-muted-foreground/30"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleUploadAndAssignResume(file);
                  }}
                >
                  <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-6">
                    <div className="flex flex-col items-center space-y-2">
                      <div className={cn(
                        "p-4 rounded-full transition-all duration-300",
                        isDragging ? "bg-primary/10 scale-110" : "bg-muted"
                      )}>
                        {isAssigningResume ? (
                          <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        ) : (
                          <UploadCloud className={cn(
                            "h-10 w-10 transition-colors",
                            isDragging ? "text-primary" : "text-muted-foreground/60"
                          )} />
                        )}
                      </div>
                      <div className="space-y-1 pt-2">
                        <p className="text-sm font-semibold">
                          {isAssigningResume ? "Uploading and processing resume..." : "Drag & drop your tailored resume here"}
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Supports PDF and DOCX files up to 10MB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAndAssignResume(file);
                        }} 
                        accept=".pdf,.docx" 
                        className="hidden" 
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isAssigningResume}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileUp className="mr-1.5 h-4 w-4" />
                        Choose File
                      </Button>
                    </div>

                    <div className="relative w-full max-w-md py-2 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/80" />
                      </div>
                      <span className="relative bg-card px-3 text-xs text-muted-foreground uppercase font-medium">
                        Or select from library
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md items-center justify-center pt-1">
                      {userResumes.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic">
                          No resumes in your library yet. Upload one above to get started!
                        </div>
                      ) : (
                        <>
                          <Select
                            value={selectedResumeId}
                            onValueChange={(val) => setSelectedResumeId(val || "")}
                            disabled={isAssigningResume}
                          >
                            <SelectTrigger className="w-full sm:w-64 h-9">
                              <SelectValue placeholder="Select a resume..." />
                            </SelectTrigger>
                            <SelectContent>
                              {userResumes.map((r) => {
                                const rid = String(r.id || r._id);
                                return (
                                  <SelectItem key={rid} value={rid}>
                                    {r.name} (V{r.versionNumber})
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            disabled={!selectedResumeId || isAssigningResume}
                            onClick={() => handleAssignResume(selectedResumeId)}
                          >
                            {isAssigningResume && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Assign Resume
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                (() => {
                  const finalFileId = typeof resumeSnapshot.finalSubmittedFileId === "object" && resumeSnapshot.finalSubmittedFileId
                    ? (resumeSnapshot.finalSubmittedFileId._id || resumeSnapshot.finalSubmittedFileId.id)
                    : resumeSnapshot.finalSubmittedFileId;

                  const baseFileId = typeof resumeSnapshot.baseResumeVersionId?.fileId === "object" && resumeSnapshot.baseResumeVersionId?.fileId
                    ? (resumeSnapshot.baseResumeVersionId.fileId._id || resumeSnapshot.baseResumeVersionId.fileId.id)
                    : resumeSnapshot.baseResumeVersionId?.fileId;

                  return (
                    <div className="space-y-6">
                      {/* Resume Details & Actions Card */}
                      <Card className="border-border/60">
                        <CardHeader className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              {resumeSnapshot.baseResumeVersionId?.name || "Assigned Resume"}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Base Version: {resumeSnapshot.baseResumeVersionId?.versionNumber || 1} • 
                              Targeting: {resumeSnapshot.baseResumeVersionId?.targetRole || "Any Role"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {resumeSnapshot.manuallyEdited ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs py-1 h-7">
                                Customized for this Application
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs py-1 h-7">
                                Original Base Version
                              </Badge>
                            )}
                            <Link
                              href={`/applications/${applicationId}/resume/customize`}
                              className={buttonVariants({ size: "sm", className: "h-7 text-xs bg-primary hover:bg-primary/90" })}
                            >
                              Customize Resume
                            </Link>
                            {finalFileId ? (
                              <a
                                href={`/api/files/${finalFileId}`}
                                download
                                className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs" })}
                              >
                                Download Custom DOCX
                              </a>
                            ) : baseFileId ? (
                              <a
                                href={`/api/files/${baseFileId}`}
                                download
                                className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs" })}
                              >
                                Download Base DOCX
                              </a>
                            ) : null}
                          </div>
                        </CardHeader>
                        {resumeSnapshot.baseResumeVersionId?.notes && (
                          <CardContent className="pb-4 border-t border-border/20 pt-4 text-xs text-muted-foreground">
                            <span className="font-bold text-foreground">Base Version Notes:</span>{" "}
                            {resumeSnapshot.baseResumeVersionId.notes}
                          </CardContent>
                        )}
                      </Card>

                      {/* Document Preview Panel */}
                      <div className="border border-border/60 rounded-xl overflow-hidden bg-background h-[600px] flex flex-col">
                        <div className="bg-muted/10 px-4 py-3 border-b border-border/60 flex items-center justify-between shrink-0">
                          <span className="text-xs font-bold text-foreground">Live Document Preview</span>
                          <span className="text-[10px] text-muted-foreground">
                            {resumeSnapshot.manuallyEdited ? "Showing customized DOCX version" : "Showing original base version"}
                          </span>
                        </div>
                        <div className="flex-1 bg-muted/5 min-h-0 relative">
                          {finalFileId ? (
                            <DocxViewer fileId={finalFileId} />
                          ) : baseFileId ? (
                            <DocxViewer fileId={baseFileId} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                              <FileText className="h-12 w-12 text-muted-foreground/30 mb-2" />
                              <p className="text-sm font-medium">No preview document available</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar (Metadata / CRM actions) */}
        <div className="w-full lg:w-1/3 space-y-6">
          {/* Status Tracker Panel */}
          <Card className="border-border/60">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-bold">Quick Status Update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sidebar-status" className="text-xs">Current Status</Label>
                  <Select
                    value={editStatus.currentStatus}
                    onValueChange={(v) => setEditStatus((p) => ({ ...p, currentStatus: v || "" }))}
                  >
                    <SelectTrigger id="sidebar-status" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sidebar-lifecycle" className="text-xs">Lifecycle Stage</Label>
                  <Select
                    value={editStatus.lifecycleStage}
                    onValueChange={(v) => setEditStatus((p) => ({ ...p, lifecycleStage: v || "" }))}
                  >
                    <SelectTrigger id="sidebar-lifecycle" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIFECYCLE_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sidebar-next-action" className="text-xs">Next Action</Label>
                  <Input
                    id="sidebar-next-action"
                    placeholder="e.g. Follow up on technical result"
                    value={editStatus.nextAction}
                    onChange={(e) =>
                      setEditStatus((p) => ({ ...p, nextAction: e.target.value }))
                    }
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <Label htmlFor="sidebar-due-date" className="text-xs">Next Action Due Date</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          id="sidebar-due-date"
                          variant="outline"
                          className={cn(
                            "w-full h-9 justify-start text-left font-normal px-3 py-1.5 text-sm border-border/60",
                            !editStatus.nextActionDueAt && "text-muted-foreground"
                          )}
                        />
                      }
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      {editStatus.nextActionDueAt ? (
                        format(new Date(editStatus.nextActionDueAt + "T00:00:00"), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border border-border rounded-md shadow-md" align="start">
                      <Calendar
                        mode="single"
                        selected={editStatus.nextActionDueAt ? new Date(editStatus.nextActionDueAt + "T00:00:00") : undefined}
                        onSelect={(date) => {
                          setEditStatus((p) => ({
                            ...p,
                            nextActionDueAt: date ? date.toISOString().split("T")[0] : "",
                          }));
                        }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button type="submit" className="w-full h-9" disabled={isUpdatingStatus}>
                  {isUpdatingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Status
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Links & Details Card */}
          <Card className="border-border/60 text-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-bold">Links & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 min-w-0">
              {app.jobUrl && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-foreground">Job Posting</span>
                  <a
                    href={app.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium break-all"
                  >
                    View Original
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
              {app.applicationUrl && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-foreground">Applied Link</span>
                  <a
                    href={app.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium break-all"
                  >
                    Application Portal
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}

              {(app.jobUrl || app.applicationUrl) && <Separator />}

              <div className="space-y-1">
                <span className="text-muted-foreground text-xs block">Company Website</span>
                {app.companyId.website ? (
                  <a
                    href={app.companyId.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium break-all"
                  >
                    {app.companyId.website}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground font-light">Not provided</span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground text-xs block">Company LinkedIn</span>
                {app.companyId.linkedinUrl ? (
                  <a
                    href={app.companyId.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium break-all"
                  >
                    LinkedIn Profile
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground font-light">Not provided</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={deleteConfirm.isOpen}
        onOpenChange={(isOpen) => setDeleteConfirm((prev) => ({ ...prev, isOpen }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              {deleteConfirm.type === "note" && "Are you sure you want to delete this note? This action cannot be undone."}
              {deleteConfirm.type === "timeline" && "Are you sure you want to delete this timeline event? This action cannot be undone."}
              {deleteConfirm.type === "application" && "Are you sure you want to delete this application? All related notes, files, and timeline history will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm.type === "note" && deleteConfirm.id) {
                  executeDeleteNote(deleteConfirm.id);
                } else if (deleteConfirm.type === "timeline" && deleteConfirm.id) {
                  executeDeleteTimeline(deleteConfirm.id);
                } else if (deleteConfirm.type === "application") {
                  executeDeleteApplication();
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingTimelineEvent !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingTimelineEvent(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Timeline Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTimeline} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-event-title">Event Title *</Label>
              <Input
                id="edit-event-title"
                placeholder="e.g. Call with recruiter, Technical round"
                value={editTimelineForm.title}
                onChange={(e) =>
                  setEditTimelineForm((p) => ({ ...p, title: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-event-type">Event Type</Label>
                <Select
                  value={editTimelineForm.type}
                  onValueChange={(v) => setEditTimelineForm((p) => ({ ...p, type: v || "" }))}
                >
                  <SelectTrigger id="edit-event-type">
                    <SelectValue>
                      {editTimelineForm.type ? editTimelineForm.type.replace("_", " ").toUpperCase() : ""}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINE_EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="edit-event-date">Event Date</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        id="edit-event-date"
                        variant="outline"
                        className={cn(
                          "w-full h-9 justify-start text-left font-normal px-3 py-1.5 text-sm border-border/60",
                          !editTimelineForm.eventDate && "text-muted-foreground"
                        )}
                      />
                    }
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {editTimelineForm.eventDate ? (
                      format(new Date(editTimelineForm.eventDate + "T00:00:00"), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover border border-border rounded-md shadow-md" align="start">
                    <Calendar
                      mode="single"
                      selected={editTimelineForm.eventDate ? new Date(editTimelineForm.eventDate + "T00:00:00") : undefined}
                      onSelect={(date) => {
                        setEditTimelineForm((p) => ({
                          ...p,
                          eventDate: date ? date.toISOString().split("T")[0] : "",
                        }));
                      }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-status-after">Update Status</Label>
                <Select
                  value={editTimelineForm.statusAfterEvent}
                  onValueChange={(v) =>
                    setEditTimelineForm((p) => ({ ...p, statusAfterEvent: v || "" }))
                  }
                >
                  <SelectTrigger id="edit-status-after">
                    <SelectValue>
                      {editTimelineForm.statusAfterEvent === "none" ? "Keep current" : editTimelineForm.statusAfterEvent || "Keep current"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keep current</SelectItem>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lifecycle-after">Update Lifecycle</Label>
                <Select
                  value={editTimelineForm.lifecycleStageAfterEvent}
                  onValueChange={(v) =>
                    setEditTimelineForm((p) => ({ ...p, lifecycleStageAfterEvent: v || "" }))
                  }
                >
                  <SelectTrigger id="edit-lifecycle-after">
                    <SelectValue>
                      {editTimelineForm.lifecycleStageAfterEvent === "none" ? "Keep current" : editTimelineForm.lifecycleStageAfterEvent || "Keep current"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keep current</SelectItem>
                    {LIFECYCLE_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-event-description">Description / Notes</Label>
              <Textarea
                id="edit-event-description"
                placeholder="Add details about what happened, questions asked, etc."
                value={editTimelineForm.description}
                onChange={(e) =>
                  setEditTimelineForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            <DialogFooter className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTimelineEvent(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingTimeline}>
                {isUpdatingTimeline && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) setIsEditDialogOpen(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Application Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateDetails} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Job Title */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-title" className="text-sm font-semibold">
                  Job Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={editDetailsForm.jobTitle}
                  onChange={(e) => setEditDetailsForm((p) => ({ ...p, jobTitle: e.target.value }))}
                  required
                />
              </div>

              {/* Company */}
              <div className="space-y-1.5 relative" ref={editCompanyRef}>
                <Label htmlFor="edit-company" className="text-sm font-semibold">
                  Company <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-company"
                    placeholder="Search or type company..."
                    value={editCompanySearchText}
                    onChange={(e) => {
                      setEditCompanySearchText(e.target.value);
                      setShowEditSuggestions(true);
                      setEditCompanyId("");
                      setFocusedEditCompanyIndex(-1);
                    }}
                    onFocus={() => setShowEditSuggestions(true)}
                    className="pl-10 h-10 bg-card"
                  />
                  {showEditSuggestions && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-md">
                      {editFilteredSuggestions.length > 0 ? (
                        editFilteredSuggestions.map((suggestion, idx) => (
                          <button
                            key={suggestion.id || suggestion._id}
                            type="button"
                            onClick={() => {
                              setEditCompanySearchText(suggestion.name);
                              setEditCompanyId(suggestion.id || suggestion._id || "");
                              setShowEditSuggestions(false);
                            }}
                            className={cn(
                              "w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                              focusedEditCompanyIndex === idx && "bg-accent text-accent-foreground"
                            )}
                          >
                            {suggestion.name}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-1.5 text-xs text-muted-foreground italic">
                          No matching companies. Typing will auto-create.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Job URL */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-joburl" className="text-sm font-semibold">Job URL</Label>
                <Input
                  id="edit-joburl"
                  type="url"
                  value={editDetailsForm.jobUrl}
                  onChange={(e) => setEditDetailsForm((p) => ({ ...p, jobUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-location" className="text-sm font-semibold">Location</Label>
                <LocationAutocomplete
                  id="edit-location"
                  value={editDetailsForm.location}
                  onChange={(v) => setEditDetailsForm((p) => ({ ...p, location: v }))}
                  placeholder="e.g. Toronto, ON"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Work Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-workmode" className="text-sm font-semibold">Work Mode</Label>
                <Select
                  value={editDetailsForm.workMode}
                  onValueChange={(v) => setEditDetailsForm((p) => ({ ...p, workMode: v || "" }))}
                >
                  <SelectTrigger id="edit-workmode" className="h-10 bg-card">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Employment Type */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-emptype" className="text-sm font-semibold">Employment Type</Label>
                <Select
                  value={editDetailsForm.employmentType}
                  onValueChange={(v) => setEditDetailsForm((p) => ({ ...p, employmentType: v || "" }))}
                >
                  <SelectTrigger id="edit-emptype" className="h-10 bg-card">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="co-op">Co-op</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-source" className="text-sm font-semibold">Source</Label>
                <Select
                  value={editDetailsForm.source}
                  onValueChange={(v) => setEditDetailsForm((p) => ({ ...p, source: v || "Other" }))}
                >
                  <SelectTrigger id="edit-source" className="h-10 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Indeed">Indeed</SelectItem>
                    <SelectItem value="Company site">Company site</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Recruiter">Recruiter</SelectItem>
                    <SelectItem value="Glassdoor">Glassdoor</SelectItem>
                    <SelectItem value="School board">School board</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Seniority */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-seniority" className="text-sm font-semibold">Seniority Level</Label>
                <Input
                  id="edit-seniority"
                  value={editDetailsForm.seniorityLevel}
                  onChange={(e) => setEditDetailsForm((p) => ({ ...p, seniorityLevel: e.target.value }))}
                  placeholder="e.g. Junior, Senior"
                />
              </div>

              {/* Salary */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Salary Range</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editDetailsForm.salaryMin}
                    onChange={(e) => setEditDetailsForm((p) => ({ ...p, salaryMin: e.target.value }))}
                    placeholder="Min"
                    className="h-10 bg-card flex-1"
                  />
                  <span className="text-muted-foreground text-xs font-semibold px-0.5">to</span>
                  <Input
                    type="number"
                    value={editDetailsForm.salaryMax}
                    onChange={(e) => setEditDetailsForm((p) => ({ ...p, salaryMax: e.target.value }))}
                    placeholder="Max"
                    className="h-10 bg-card flex-1"
                  />
                  <Select
                    value={editDetailsForm.currency}
                    onValueChange={(v) => setEditDetailsForm((p) => ({ ...p, currency: v || "USD" }))}
                  >
                    <SelectTrigger className="h-10 bg-card w-24">
                      <SelectValue placeholder="USD" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-sm font-semibold">Job Description</Label>
              <Textarea
                id="edit-desc"
                value={editDetailsForm.jobDescription}
                onChange={(e) => setEditDetailsForm((p) => ({ ...p, jobDescription: e.target.value }))}
                placeholder="Paste the job description..."
                rows={5}
              />
            </div>

            <DialogFooter className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingDetails}>
                {isUpdatingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Details
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
