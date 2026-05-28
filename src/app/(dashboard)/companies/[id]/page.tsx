"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  ExternalLink,
  Loader2,
  MapPin,
  Star,
  Trash2,
  Undo2,
  AlertCircle,
  Briefcase,
} from "lucide-react";

interface CompanyDetails {
  id: string;
  name: string;
  website: string;
  careersUrl: string;
  linkedinUrl: string;
  industry: string;
  location: string;
  notes: string;
  rating: number;
  tags: string[];
  doNotApplyAgain: boolean;
}

interface CompanyApplication {
  id: string;
  jobTitle: string;
  currentStatus: string;
  appliedAt: string | null;
  createdAt: string;
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const companyId = resolvedParams.id;

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit states
  const [editNotes, setEditNotes] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [editDnd, setEditDnd] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}`);
      const data = await res.json();
      if (data.success) {
        setCompany(data.data.company);
        setApplications(data.data.applications || []);
        setEditNotes(data.data.company.notes || "");
        setEditRating(data.data.company.rating || 0);
        setEditDnd(data.data.company.doNotApplyAgain || false);
      } else {
        toast.error(data.error || "Failed to load company details");
        router.push("/companies");
      }
    } catch {
      toast.error("Failed to load company details");
      router.push("/companies");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, router]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  async function handleUpdateField(fields: Partial<CompanyDetails>) {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Company updated");
      fetchDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update company");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteCompany() {
    if (applications.length > 0) {
      toast.error(
        `Cannot delete company. There are ${applications.length} applications linked to it. Delete them first.`
      );
      return;
    }

    if (!confirm("Are you sure you want to delete this company?")) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Company deleted successfully");
      router.push("/companies");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete company");
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

  if (!company) return null;

  return (
    <div className="space-y-6">
      {/* Navigation & actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/companies"
          className={buttonVariants({ variant: "ghost", className: "pl-0 text-muted-foreground hover:text-foreground" })}
        >
          <Undo2 className="mr-2 h-4 w-4" />
          Back to companies
        </Link>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteCompany}
          disabled={isDeleting || applications.length > 0}
          title={applications.length > 0 ? "Cannot delete company with applications" : ""}
        >
          {isDeleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Delete Company
        </Button>
      </div>

      {/* Main card */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
                {company.doNotApplyAgain && (
                  <Badge variant="destructive">Do Not Apply Again</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {company.industry && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {company.industry}
                  </span>
                )}
                {company.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {company.location}
                  </span>
                )}
              </div>
            </div>

            {/* Rating Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Company Rating:</span>
              <Select
                value={editRating.toString()}
                onValueChange={(v) => {
                  const num = parseInt(v || "0");
                  setEditRating(num);
                  handleUpdateField({ rating: num });
                }}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                      {r} {r === 1 ? "Star" : "Stars"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {/* External links */}
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Company Website
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {company.careersUrl && (
              <a
                href={company.careersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Careers Page
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {company.linkedinUrl && (
              <a
                href={company.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                LinkedIn Page
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {!company.website && !company.careersUrl && !company.linkedinUrl && (
              <span className="text-muted-foreground italic text-xs">No links provided.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid: left sidebar for notes, main content for applications */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: notes & DND toggle */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Settings & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="detail-dnd"
                  type="checkbox"
                  checked={editDnd}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditDnd(checked);
                    handleUpdateField({ doNotApplyAgain: checked });
                  }}
                  disabled={isUpdating}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="detail-dnd" className="text-sm font-medium">
                  Do Not Apply Again
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Private Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Recruiter contact info, interview stages, key priorities..."
                  rows={8}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleUpdateField({ notes: editNotes })}
                  disabled={isUpdating}
                >
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: applications history */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            Applications History ({applications.length})
          </h3>

          {applications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-medium">No applications linked to this company</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create an application and associate it with {company.name}.
                </p>
                <Link
                  href={`/applications?new=true&companyId=${company.id}`}
                  className={buttonVariants({ size: "sm", className: "mt-4" })}
                >
                  Create Application
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {applications.map((app) => (
                <Link key={app.id} href={`/applications/${app.id}`} className="block">
                  <Card className="hover:border-primary/30 transition-all">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-medium text-sm">{app.jobTitle}</h4>
                        <span className="text-xs text-muted-foreground block mt-1">
                          Applied: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "Saved"}
                        </span>
                      </div>
                      <Badge variant="outline">{app.currentStatus}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
