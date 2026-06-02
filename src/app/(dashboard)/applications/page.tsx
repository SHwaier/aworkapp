"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Briefcase,
  Loader2,
  Building2,
  MapPin,
  Filter,
  Kanban,
  List,
  Calendar,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { getStatusVariant } from "@/lib/utils/status";
import { useDebounce } from "@/lib/utils/use-debounce";

import { APPLICATION_STATUSES } from "@/lib/validators/schemas";

interface Application {
  _id?: string;
  id?: string;
  jobTitle: string;
  currentStatus: string;
  lifecycleStage: string;
  location: string;
  workMode: string;
  source: string;
  nextAction: string;
  nextActionDueAt: string | null;
  createdAt: string;
  appliedAt: string | null;
  companyId: { id?: string; _id?: string; name: string; industry: string; location: string } | null;
}

// Group definitions for Kanban Columns
const KANBAN_COLUMNS = [
  {
    id: "Saved",
    title: "Saved & Interested",
    bgClass: "bg-muted/30 border-muted-foreground/10",
    textClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground/60",
    statuses: ["Saved", "Interested", "Preparing documents"],
    defaultStatus: "Saved",
  },
  {
    id: "Applied",
    title: "Applied & Waiting",
    bgClass: "bg-blue-500/5 border-blue-500/10",
    textClass: "text-blue-500",
    dotClass: "bg-blue-500",
    statuses: ["Applied", "Waiting for response", "Follow-up needed", "Follow-up sent"],
    defaultStatus: "Applied",
  },
  {
    id: "Interviewing",
    title: "Interviewing",
    bgClass: "bg-amber-500/5 border-amber-500/10",
    textClass: "text-amber-500",
    dotClass: "bg-amber-500",
    statuses: [
      "Screening scheduled",
      "Screening completed",
      "Interview scheduled",
      "Interview completed",
      "Technical assessment pending",
      "Technical assessment completed",
      "Final round",
      "Recruiter contacted",
    ],
    defaultStatus: "Interview scheduled",
  },
  {
    id: "Offer",
    title: "Offers",
    bgClass: "bg-emerald-500/5 border-emerald-500/10",
    textClass: "text-emerald-500",
    dotClass: "bg-emerald-500",
    statuses: ["Offer received", "Offer accepted"],
    defaultStatus: "Offer received",
  },
  {
    id: "Closed",
    title: "Closed / Ended",
    bgClass: "bg-rose-500/5 border-rose-500/10",
    textClass: "text-rose-500",
    dotClass: "bg-rose-500",
    statuses: ["Rejected", "Ghosted", "Withdrawn", "Offer declined", "Closed / posting removed"],
    defaultStatus: "Rejected",
  },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewType, setViewType] = useState<"list" | "board">("board");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeOverColumn, setActiveOverColumn] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: viewType === "board" ? "1" : page.toString(),
        limit: viewType === "board" ? "100" : "15",
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/applications?${params}`);
      const data = await res.json();
      if (data.success) {
        setApplications(data.data.applications);
        setTotal(data.data.pagination.total);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, viewType]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setActiveOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (activeOverColumn !== colId) {
      setActiveOverColumn(colId);
    }
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const transferId = e.dataTransfer.getData("text/plain");
    const isValidId = /^[0-9a-fA-F]{24}$/.test(transferId);
    const appId = isValidId ? transferId : draggedId;
    if (!appId) return;

    // Reset indicator state
    setActiveOverColumn(null);

    const column = KANBAN_COLUMNS.find((c) => c.id === colId);
    if (!column) return;

    const newStatus = column.defaultStatus;

    // Instantly update UI locally (optimistic update)
    setApplications((prev) =>
      prev.map((app) =>
        (app.id || app._id) === appId ? { ...app, currentStatus: newStatus } : app
      )
    );

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStatus: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Moved to ${column.title}`);
    } catch (err) {
      toast.error("Failed to update status");
      // Rollback
      fetchApplications();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1">
      {/* Dynamic Dashboard/Aesthetics Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-transparent to-primary/5 p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/5 blur-3xl rounded-full" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <Sparkles className="h-3 w-3" />
              Job Search Control Center
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-foreground to-foreground/80 bg-clip-text">
              Applications
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Organize, track, and move your applications in real-time. Drag and drop cards to change their active stage.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="inline-flex items-center rounded-lg border border-border p-1 bg-muted/20">
              <button
                onClick={() => {
                  setViewType("board");
                  fetchApplications();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewType === "board"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Board View"
              >
                <Kanban className="h-3.5 w-3.5" />
                Board
              </button>
              <button
                onClick={() => {
                  setViewType("list");
                  fetchApplications();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewType === "list"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>

            <Button onClick={() => router.push("/applications/new")} className="shadow-md shadow-primary/10 hover:shadow-lg transition-all" id="create-application-btn">
              <Plus className="mr-1.5 h-4 w-4" />
              New Application
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by job title, company, description, or tags..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 h-10 bg-card border-border/80 shadow-xs focus:ring-1 focus:ring-primary/20"
            id="search-applications"
          />
        </div>
        
        {/* Only show status filter in list view */}
        {viewType === "list" && (
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[220px] h-10 bg-card border-border/80" id="status-filter">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All statuses" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {APPLICATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Dynamic Views Container */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Gathering applications...</span>
        </div>
      ) : applications.length === 0 ? (
        <Card className="border border-dashed border-border/80 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <Briefcase className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">No applications found</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              {search || statusFilter !== "all"
                ? "We couldn't find any matches. Try modifying your search query or filters."
                : "Your application stream is empty! Log your active opportunities and track progress."}
            </p>
            {!search && statusFilter === "all" && (
              <Button
                className="mt-6"
                onClick={() => router.push("/applications/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Log Your First Application
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewType === "list" ? (
        /* ================= LIST VIEW ================= */
        <div className="space-y-3 w-full min-w-0">
          <div className="grid gap-2.5 w-full min-w-0">
            {applications.map((app) => (
              <Link
                key={app.id || app._id}
                href={`/applications/${app.id || app._id}`}
                className="group block w-full min-w-0"
              >
                <Card className="w-full min-w-0 border border-border/80 bg-card transition-all duration-200 hover:border-primary/20 hover:shadow-xs group-hover:-translate-y-[1px] overflow-hidden">
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 w-full min-w-0">
                    <div className="flex items-start gap-3 sm:gap-4 w-full min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors w-full">
                          {app.jobTitle}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground w-full">
                          {app.companyId && (
                            <span className="flex items-center gap-1 font-medium text-foreground/80 max-w-[120px] sm:max-w-[200px] truncate">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {app.companyId.name}
                            </span>
                          )}
                          {app.location && (
                            <span className="flex items-center gap-1 max-w-[100px] sm:max-w-[150px] truncate">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {app.location}
                            </span>
                          )}
                          {app.workMode && (
                            <Badge variant="secondary" className="capitalize text-[11px] px-2 py-0 h-5">
                              {app.workMode}
                            </Badge>
                          )}
                        </div>
                        {app.nextAction && (
                          <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-warning/5 border border-warning/10 text-warning-foreground font-medium max-w-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse shrink-0" />
                            <span className="truncate">Next action: {app.nextAction}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-0 border-border/40 pt-3 sm:pt-0 shrink-0 w-full sm:w-auto">
                      <Badge variant={getStatusVariant(app.currentStatus)} className="text-xs px-2.5 py-0.5 shadow-2xs font-semibold">
                        {app.currentStatus}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {app.appliedAt
                          ? new Date(app.appliedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                          : new Date(app.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-9"
              >
                Previous
              </Button>
              <span className="text-xs font-semibold text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-9"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* ================= KANBAN BOARD VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 items-start select-none">
          {KANBAN_COLUMNS.map((column) => {
            const columnApps = applications.filter((app) =>
              column.statuses.includes(app.currentStatus)
            );

            const isOver = activeOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`flex flex-col rounded-xl border p-3 min-h-[500px] transition-all duration-200 ${column.bgClass} ${
                  isOver ? "border-dashed ring-2 ring-primary/20 scale-[1.01] bg-primary/[0.02]" : "border-border/60"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-border/40 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${column.dotClass}`} />
                    <h3 className="font-semibold text-sm tracking-tight text-foreground/90">
                      {column.title}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="px-2 py-0 h-5 font-bold rounded-md bg-muted/60 text-foreground/80">
                    {columnApps.length}
                  </Badge>
                </div>

                {/* Cards List */}
                <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto">
                  {columnApps.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-10 border border-dashed border-border/20 rounded-lg text-center">
                      <span className="text-xs text-muted-foreground/60 font-medium">Drop here to update</span>
                    </div>
                  ) : (
                    columnApps.map((app) => (
                      <div
                        key={app.id || app._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id || app._id || "")}
                        onDragEnd={handleDragEnd}
                        className={`group relative border border-border/80 bg-card rounded-lg p-3.5 cursor-grab active:cursor-grabbing transition-all hover:border-primary/20 hover:shadow-xs hover:-translate-y-[1px] ${
                          draggedId === (app.id || app._id) ? "opacity-30 border-dashed" : "opacity-100"
                        }`}
                      >
                        {/* Go to Detail Icon */}
                        <Link
                          href={`/applications/${app.id || app._id}`}
                          className="absolute right-3 top-3 h-5 w-5 rounded-md bg-muted/20 text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary/5 hover:text-primary transition-all duration-150"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>

                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-foreground leading-snug truncate pr-4 group-hover:text-primary transition-colors">
                            {app.jobTitle}
                          </h4>
                          {app.companyId && (
                            <p className="text-xs font-semibold text-foreground/75 truncate flex items-center gap-1">
                              <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                              {app.companyId.name}
                            </p>
                          )}
                        </div>

                        {/* Badges/Details Grid */}
                        <div className="mt-3 flex flex-wrap gap-1 items-center">
                          {app.location && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/40 text-muted-foreground max-w-[120px] truncate">
                              {app.location}
                            </Badge>
                          )}
                          {app.workMode && (
                            <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0 h-4 bg-muted/65 text-foreground/70">
                              {app.workMode}
                            </Badge>
                          )}
                        </div>

                        {app.nextAction && (
                          <div className="mt-2.5 pt-2 border-t border-border/30 text-[10px] text-warning-foreground font-medium flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-warning animate-pulse" />
                            <span className="truncate">Next: {app.nextAction}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
