"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Briefcase,
  Loader2,
  Building2,
  MapPin,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";

import {
  APPLICATION_STATUSES,
  WORK_MODES,
  EMPLOYMENT_TYPES,
  JOB_SOURCES,
} from "@/lib/validators/schemas";

interface Application {
  _id: string;
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
  companyId: { _id: string; name: string; industry: string; location: string } | null;
}

interface Company {
  _id: string;
  name: string;
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

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showNewDialog, setShowNewDialog] = useState(
    searchParams.get("new") === "true"
  );

  // New application form state
  const [newApp, setNewApp] = useState({
    companyId: "",
    newCompanyName: "",
    jobTitle: "",
    jobDescription: "",
    jobUrl: "",
    location: "",
    workMode: "" as string,
    employmentType: "" as string,
    source: "Other" as string,
    currentStatus: "Saved" as string,
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      if (search) params.set("search", search);
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
  }, [page, search, statusFilter]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies?limit=100");
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data.companies);
      }
    } catch {
      // Silently fail — companies are optional
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function handleCreateApplication(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);

    try {
      let companyId = newApp.companyId;

      // Create company if new
      if (!companyId && newApp.newCompanyName) {
        const companyRes = await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newApp.newCompanyName }),
        });
        const companyData = await companyRes.json();
        if (!companyRes.ok) throw new Error(companyData.error);
        companyId = companyData.data.company._id;
        setCompanies((prev) => [...prev, companyData.data.company]);
      }

      if (!companyId) {
        toast.error("Please select or create a company");
        return;
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newApp,
          companyId,
          workMode: newApp.workMode || undefined,
          employmentType: newApp.employmentType || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Application created");
      setShowNewDialog(false);
      setNewApp({
        companyId: "",
        newCompanyName: "",
        jobTitle: "",
        jobDescription: "",
        jobUrl: "",
        location: "",
        workMode: "",
        employmentType: "",
        source: "Other",
        currentStatus: "Saved",
      });
      router.push(`/applications/${data.data.application._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">
            {total} application{total !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} id="create-application-btn">
          <Plus className="mr-2 h-4 w-4" />
          New Application
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by job title, description, or tags..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            id="search-applications"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v || "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]" id="status-filter">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {APPLICATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-medium">No applications found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "Start tracking your job search by adding your first application."}
            </p>
            {!search && statusFilter === "all" && (
              <Button
                className="mt-4"
                onClick={() => setShowNewDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Application
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <Link
              key={app._id}
              href={`/applications/${app._id}`}
              className="group block"
            >
              <Card className="transition-all duration-150 hover:border-primary/30 hover:shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                        {app.jobTitle}
                      </h3>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {app.companyId && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {app.companyId.name}
                        </span>
                      )}
                      {app.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {app.location}
                        </span>
                      )}
                      {app.workMode && (
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {app.workMode}
                        </Badge>
                      )}
                    </div>
                    {app.nextAction && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Next: {app.nextAction}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={getStatusColor(app.currentStatus)}>
                      {app.currentStatus}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {app.appliedAt
                        ? new Date(app.appliedAt).toLocaleDateString()
                        : new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* New Application Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Application</DialogTitle>
            <DialogDescription>
              Track a new job application. You can add more details later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateApplication} className="space-y-4">
            {/* Company Selection */}
            <div className="space-y-2">
              <Label htmlFor="new-app-company">Company</Label>
              {companies.length > 0 ? (
                <Select
                  value={newApp.companyId}
                  onValueChange={(v) => {
                    if (v === "new") {
                      setNewApp((p) => ({ ...p, companyId: "" }));
                    } else {
                      setNewApp((p) => ({
                        ...p,
                        companyId: v || "",
                        newCompanyName: "",
                      }));
                    }
                  }}
                >
                  <SelectTrigger id="new-app-company">
                    <SelectValue placeholder="Select or create a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">+ Create new company</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {(!newApp.companyId || companies.length === 0) && (
                <Input
                  placeholder="Company name"
                  value={newApp.newCompanyName}
                  onChange={(e) =>
                    setNewApp((p) => ({
                      ...p,
                      newCompanyName: e.target.value,
                    }))
                  }
                  id="new-app-company-name"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-app-title">Job Title *</Label>
              <Input
                id="new-app-title"
                value={newApp.jobTitle}
                onChange={(e) =>
                  setNewApp((p) => ({ ...p, jobTitle: e.target.value }))
                }
                placeholder="e.g. Software Engineer"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-app-status">Status</Label>
                <Select
                  value={newApp.currentStatus}
                  onValueChange={(v) =>
                    setNewApp((p) => ({ ...p, currentStatus: v || "" }))
                  }
                >
                  <SelectTrigger id="new-app-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-app-source">Source</Label>
                <Select
                  value={newApp.source}
                  onValueChange={(v) =>
                    setNewApp((p) => ({ ...p, source: v || "" }))
                  }
                >
                  <SelectTrigger id="new-app-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-app-location">Location</Label>
                <Input
                  id="new-app-location"
                  value={newApp.location}
                  onChange={(e) =>
                    setNewApp((p) => ({ ...p, location: e.target.value }))
                  }
                  placeholder="e.g. Toronto, ON"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-app-workmode">Work Mode</Label>
                <Select
                  value={newApp.workMode}
                  onValueChange={(v) =>
                    setNewApp((p) => ({ ...p, workMode: v || "" }))
                  }
                >
                  <SelectTrigger id="new-app-workmode">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-app-url">Job Posting URL</Label>
              <div className="relative">
                <Input
                  id="new-app-url"
                  type="url"
                  value={newApp.jobUrl}
                  onChange={(e) =>
                    setNewApp((p) => ({ ...p, jobUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className="pr-8"
                />
                {newApp.jobUrl && (
                  <ExternalLink className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-app-description">Job Description</Label>
              <Textarea
                id="new-app-description"
                value={newApp.jobDescription}
                onChange={(e) =>
                  setNewApp((p) => ({
                    ...p,
                    jobDescription: e.target.value,
                  }))
                }
                placeholder="Paste the job description here..."
                rows={4}
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
              <Button type="submit" disabled={isCreating} id="submit-new-application">
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Application
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
