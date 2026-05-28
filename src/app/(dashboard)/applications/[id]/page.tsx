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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  History,
  Loader2,
  MapPin,
  Pin,
  Plus,
  Trash2,
  Undo2,
  User,
  AlertCircle,
  File,
} from "lucide-react";
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
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

function getStatusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  const positive = ["Offer received", "Offer accepted", "Interview scheduled", "Interview completed", "Final round"];
  const negative = ["Rejected", "Ghosted", "Withdrawn", "Closed / posting removed"];
  const warning = ["Follow-up needed", "Technical assessment pending", "Preparing documents"];
  if (positive.includes(status)) return "default";
  if (negative.includes(status)) return "destructive";
  if (warning.includes(status)) return "secondary";
  return "outline";
}

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const applicationId = resolvedParams.id;

  const [app, setApp] = useState<ApplicationDetails | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Note deleted");
      fetchDetails();
    } catch (err) {
      toast.error("Failed to delete note");
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

  async function handleDeleteTimeline(eventId: string) {
    if (!confirm("Are you sure you want to delete this timeline event?")) return;
    try {
      const res = await fetch(`/api/timeline/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Timeline event deleted");
      fetchDetails();
    } catch (err) {
      toast.error("Failed to delete event");
    }
  }

  async function handleDeleteApplication() {
    if (
      !confirm(
        "Are you sure you want to delete this application? All related notes, files, and timeline history will be permanently deleted."
      )
    ) {
      return;
    }
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
          onClick={handleDeleteApplication}
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

      {/* Main Header Card */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{app.jobTitle}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Building2 className="h-4 w-4" />
                  <Link href={`/companies/${app.companyId.id}`} className="hover:underline">
                    {app.companyId.name}
                  </Link>
                </span>
                {app.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {app.location}
                  </span>
                )}
                {app.workMode && (
                  <Badge variant="outline" className="text-xs">
                    {app.workMode}
                  </Badge>
                )}
                {app.employmentType && (
                  <Badge variant="outline" className="text-xs">
                    {app.employmentType}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="text-right md:block">
                <span className="block text-xs text-muted-foreground">Current Status</span>
                <Badge variant={getStatusColor(app.currentStatus)} className="text-sm font-medium mt-1">
                  {app.currentStatus}
                </Badge>
              </div>
              <Separator orientation="vertical" className="h-10 mx-2 hidden md:block" />
              <div className="text-right md:block">
                <span className="block text-xs text-muted-foreground">Lifecycle Stage</span>
                <Badge variant="outline" className="text-sm font-medium mt-1">
                  {app.lifecycleStage}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <span className="block text-xs text-muted-foreground">Source</span>
              <span className="text-sm font-medium">{app.source || "—"}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Seniority</span>
              <span className="text-sm font-medium">{app.seniorityLevel || "—"}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Salary Range</span>
              <span className="text-sm font-medium">
                {app.salaryMin !== null || app.salaryMax !== null
                  ? `${app.salaryMin ? `${app.currency} ${app.salaryMin.toLocaleString()}` : "—"} to ${
                      app.salaryMax ? `${app.currency} ${app.salaryMax.toLocaleString()}` : "—"
                    }`
                  : "—"}
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Applied Date</span>
              <span className="text-sm font-medium">
                {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column (Timeline, Notes, Q&A) */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-3 border-b rounded-none bg-transparent p-0 h-auto">
              <TabsTrigger
                value="timeline"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5"
              >
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5"
              >
                Notes ({notes.length})
              </TabsTrigger>
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5"
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
                              <SelectValue />
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
                        <div className="space-y-2">
                          <Label htmlFor="event-date">Event Date</Label>
                          <Input
                            id="event-date"
                            type="date"
                            value={timelineForm.eventDate}
                            onChange={(e) =>
                              setTimelineForm((p) => ({ ...p, eventDate: e.target.value }))
                            }
                            required
                          />
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
                              <SelectValue placeholder="Keep current" />
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
                              <SelectValue placeholder="Keep current" />
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
                  {timeline.map((event) => (
                    <div key={event.id} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{event.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.eventDate).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleDeleteTimeline(event.id)}
                              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Delete event"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {event.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {event.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 uppercase">
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
                  ))}
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
                {notes.map((note) => (
                  <Card key={note.id} className={cn("border-border/60", note.pinned && "border-primary/30")}>
                    <CardHeader className="flex flex-row items-start justify-between py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={note.pinned ? "default" : "outline"} className="text-[10px] py-0 px-1.5 h-4">
                            {note.type.toUpperCase()}
                          </Badge>
                          {note.title && <h4 className="font-semibold text-sm">{note.title}</h4>}
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
                          onClick={() => handlePinNote(note.id, note.pinned)}
                        >
                          <Pin className={cn("h-3.5 w-3.5", note.pinned && "fill-primary text-primary")} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3 pt-0">
                      <p className="text-sm whitespace-pre-wrap text-foreground/80">{note.body}</p>
                    </CardContent>
                  </Card>
                ))}
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

                <div className="space-y-1.5">
                  <Label htmlFor="sidebar-due-date" className="text-xs">Next Action Due Date</Label>
                  <Input
                    id="sidebar-due-date"
                    type="date"
                    value={editStatus.nextActionDueAt}
                    onChange={(e) =>
                      setEditStatus((p) => ({ ...p, nextActionDueAt: e.target.value }))
                    }
                    className="h-9 text-sm"
                  />
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
    </div>
  );
}
