"use client";

import { useEffect, useState, useCallback, use } from "react";
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
} from "lucide-react";
import { getStatusVariant } from "@/lib/utils/status";
import {
  APPLICATION_STATUSES,
  LIFECYCLE_STAGES,
  NOTE_TYPES,
  TIMELINE_EVENT_TYPES,
} from "@/lib/validators/schemas";

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

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const applicationId = resolvedParams.id;

  const [app, setApp] = useState<ApplicationDetails | null>(null);
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

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

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
    <div className="space-y-6">
      {/* Back and actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/applications"
          className={buttonVariants({ variant: "ghost", className: "pl-0 text-muted-foreground hover:text-foreground" })}
        >
          <Undo2 className="mr-2 h-4 w-4" />
          Back to applications
        </Link>
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

      {/* Main Header Container (Decluttered flat view) */}
      <div className="pb-6 border-b border-border/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight">{app.jobTitle}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Link href={`/companies/${app.companyId.id}`} className="hover:underline hover:text-primary transition-colors">
                  {app.companyId.name}
                </Link>
              </span>
              {app.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {app.location}
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-left md:text-right">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Current Status</span>
              <Badge variant={getStatusVariant(app.currentStatus)} className="text-xs font-semibold mt-1 px-2.5 py-0.5 uppercase tracking-wide">
                {app.currentStatus}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-8 mx-1 hidden md:block" />
            <div className="text-left md:text-right">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Lifecycle Stage</span>
              <Badge variant="outline" className="text-xs font-semibold mt-1 px-2.5 py-0.5 uppercase tracking-wide bg-muted/10">
                {app.lifecycleStage}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 mt-6 sm:grid-cols-2 md:grid-cols-4 bg-muted/20 dark:bg-muted/5 p-4 rounded-xl border border-border/40">
          <div>
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Source</span>
            <span className="text-sm font-semibold mt-0.5 block">{app.source || "—"}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Seniority</span>
            <span className="text-sm font-semibold mt-0.5 block">{app.seniorityLevel || "—"}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Salary Range</span>
            <span className="text-sm font-semibold mt-0.5 block">
              {app.salaryMin !== null || app.salaryMax !== null
                ? `${app.salaryMin ? `${app.currency} ${app.salaryMin.toLocaleString()}` : "—"} to ${
                    app.salaryMax ? `${app.currency} ${app.salaryMax.toLocaleString()}` : "—"
                  }`
                : "—"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Applied Date</span>
            <span className="text-sm font-semibold mt-0.5 block">
              {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column (Timeline, Notes, Q&A) */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList variant="line" className="flex w-full justify-start border-b border-border/60 bg-transparent p-0 rounded-none h-12 group-data-horizontal/tabs:h-12 gap-6 mb-6">
              <TabsTrigger
                value="timeline"
                className="flex-none rounded-none bg-transparent px-6 text-sm font-semibold text-muted-foreground hover:text-foreground data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary after:bottom-0 transition-all"
              >
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex-none rounded-none bg-transparent px-6 text-sm font-semibold text-muted-foreground hover:text-foreground data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary after:bottom-0 transition-all flex items-center gap-1.5"
              >
                Notes
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                  {notes.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="description"
                className="flex-none rounded-none bg-transparent px-6 text-sm font-semibold text-muted-foreground hover:text-foreground data-active:text-primary group-data-[variant=line]/tabs-list:data-active:after:bg-primary after:bottom-0 transition-all"
              >
                Job Description
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
                        <span className={cn("absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 transition-colors", theme.dotBorder)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full transition-colors", theme.dotBg)} />
                        </span>

                        <div className={cn("space-y-1 p-3 rounded-lg border transition-all duration-200", theme.bg || "bg-card/50", theme.border || "border-border/40")}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{event.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.eventDate).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => startEditTimeline(event)}
                                className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-md transition-all sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center"
                                aria-label="Edit event"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => requestDeleteTimeline(event._id || event.id)}
                                className="text-muted-foreground hover:text-destructive p-1.5 hover:bg-muted rounded-md transition-all sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center"
                                aria-label="Delete event"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {event.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {event.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <Badge className={cn("text-[10px] py-0 px-1.5 h-4 uppercase border font-semibold", theme.badge)}>
                              {event.type.replace("_", " ")}
                            </Badge>
                            {event.statusAfterEvent && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                Status: {event.statusAfterEvent}
                              </Badge>
                            )}
                          </div>
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
                  <CardTitle className="text-sm">Add Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-3">
                  <div className="grid grid-cols-2 gap-3">
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
                        className="h-8"
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
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase border", theme.badge)}>
                              {theme.badgeText}
                            </span>
                            {note.title && <h4 className="font-semibold text-sm">{note.title}</h4>}
                            {note.pinned && <Pin className="h-3 w-3 fill-primary text-primary" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-1">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
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
                        <p className="text-sm whitespace-pre-wrap text-foreground/80">{note.body}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Description Tab */}
            <TabsContent value="description" className="pt-4">
              <Card>
                <CardContent className="p-4 whitespace-pre-wrap text-sm text-foreground/80">
                  {app.jobDescription || (
                    <span className="text-muted-foreground italic">No job description provided.</span>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar (Metadata / CRM actions) */}
        <div className="space-y-6">
          {/* Status Tracker Panel */}
          <Card className="border-border/60">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Quick Status Update</CardTitle>
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
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm">Links & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {app.jobUrl && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Job Posting</span>
                  <a
                    href={app.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                  >
                    View Original
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {app.applicationUrl && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Applied Link</span>
                  <a
                    href={app.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                  >
                    Application Portal
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <Separator />

              <div>
                <span className="text-muted-foreground text-xs block">Company Website</span>
                {app.companyId.website ? (
                  <a
                    href={app.companyId.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium mt-0.5"
                  >
                    {app.companyId.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground font-light">Not provided</span>
                )}
              </div>

              <div>
                <span className="text-muted-foreground text-xs block">Company LinkedIn</span>
                {app.companyId.linkedinUrl ? (
                  <a
                    href={app.companyId.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium mt-0.5"
                  >
                    LinkedIn Profile
                    <ExternalLink className="h-3 w-3" />
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
    </div>
  );
}
