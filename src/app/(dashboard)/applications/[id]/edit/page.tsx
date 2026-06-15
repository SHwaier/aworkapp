"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Loader2, Undo2 } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

export default function EditApplicationPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const applicationId = params.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);

  const [editCompanySearchText, setEditCompanySearchText] = useState("");
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const [editCompanyId, setEditCompanyId] = useState("");
  const [focusedEditCompanyIndex, setFocusedEditCompanyIndex] = useState(-1);
  const editCompanyRef = useRef<HTMLDivElement>(null);

  const [editDetailsForm, setEditDetailsForm] = useState({
    jobTitle: "",
    jobDescription: "",
    jobUrl: "",
    location: "",
    workMode: "",
    employmentType: "",
    source: "",
    seniorityLevel: "",
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
  });

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies?limit=1000");
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data.companies);
      }
    } catch {
      toast.error("Failed to load companies");
    }
  }, []);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const app = data.data.application;

      setEditDetailsForm({
        jobTitle: app.jobTitle,
        jobDescription: app.jobDescription || "",
        jobUrl: app.jobUrl || "",
        location: app.location || "",
        workMode: app.workMode || "",
        employmentType: app.employmentType || "",
        source: app.source || "Other",
        seniorityLevel: app.seniorityLevel || "",
        salaryMin: app.salaryMin ? app.salaryMin.toString() : "",
        salaryMax: app.salaryMax ? app.salaryMax.toString() : "",
        currency: app.currency || "USD",
      });
      setEditCompanySearchText(app.companyId.name);
      setEditCompanyId(app.companyId.id || app.companyId._id);
    } catch (err) {
      toast.error("Failed to load application");
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchCompanies();
    fetchDetails();
  }, [fetchCompanies, fetchDetails]);

  // Click outside to close edit company suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editCompanyRef.current && !editCompanyRef.current.contains(event.target as Node)) {
        setShowEditSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const editFilteredSuggestions = companies.filter((c) =>
    c.name.toLowerCase().includes(editCompanySearchText.toLowerCase())
  );

  async function handleUpdateDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!editDetailsForm.jobTitle.trim() || !editCompanySearchText.trim()) {
      toast.error("Job title and Company name are required");
      return;
    }
    setIsUpdatingDetails(true);

    try {
      let finalCompanyId = editCompanyId;
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
      router.push(`/applications/${applicationId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update details");
      setIsUpdatingDetails(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 sm:px-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <Link
            href={`/applications/${applicationId}`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "pl-0 text-muted-foreground hover:text-foreground mb-2",
            })}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Back to Application
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Edit Application
          </h1>
        </div>
      </div>

      <form id="edit-app-form" onSubmit={handleUpdateDetails} className="space-y-8">
        
        {/* Basic Information Card */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>The core details of this application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-sm font-semibold">
                  Job Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={editDetailsForm.jobTitle}
                  onChange={(e) => setEditDetailsForm((p) => ({ ...p, jobTitle: e.target.value }))}
                  required
                  className="h-11 bg-card/50 focus-visible:bg-background transition-colors"
                />
              </div>

              {/* Company */}
              <div className="space-y-2 relative" ref={editCompanyRef}>
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
                    className="pl-10 h-11 bg-card/50 focus-visible:bg-background transition-colors"
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
                              "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                              focusedEditCompanyIndex === idx && "bg-accent text-accent-foreground"
                            )}
                          >
                            {suggestion.name}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-muted-foreground italic">
                          No matching companies. Typing will auto-create.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Job URL */}
              <div className="space-y-2">
                <Label htmlFor="edit-joburl" className="text-sm font-semibold">
                  Job URL
                </Label>
                <Input
                  id="edit-joburl"
                  type="url"
                  value={editDetailsForm.jobUrl}
                  onChange={(e) => setEditDetailsForm((p) => ({ ...p, jobUrl: e.target.value }))}
                  placeholder="https://..."
                  className="h-11 bg-card/50 focus-visible:bg-background transition-colors"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="edit-location" className="text-sm font-semibold">
                  Location
                </Label>
                <LocationAutocomplete
                  id="edit-location"
                  value={editDetailsForm.location}
                  onChange={(v) => setEditDetailsForm((p) => ({ ...p, location: v }))}
                  placeholder="e.g. Toronto, ON"
                  className="h-11 bg-card/50 focus-visible:bg-background transition-colors"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Details Card */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Role Details</CardTitle>
            <CardDescription>Information about the role's setup and compensation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Work Mode */}
              <div className="space-y-2">
                <Label htmlFor="edit-workmode" className="text-sm font-semibold">
                  Work Mode
                </Label>
                <Select
                  value={editDetailsForm.workMode}
                  onValueChange={(v) => setEditDetailsForm((p) => ({ ...p, workMode: v || "" }))}
                >
                  <SelectTrigger id="edit-workmode" className="h-11 bg-card/50 focus-visible:bg-background transition-colors">
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
              <div className="space-y-2">
                <Label htmlFor="edit-emptype" className="text-sm font-semibold">
                  Employment Type
                </Label>
                <Select
                  value={editDetailsForm.employmentType}
                  onValueChange={(v) =>
                    setEditDetailsForm((p) => ({ ...p, employmentType: v || "" }))
                  }
                >
                  <SelectTrigger id="edit-emptype" className="h-11 bg-card/50 focus-visible:bg-background transition-colors">
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
              <div className="space-y-2">
                <Label htmlFor="edit-source" className="text-sm font-semibold">
                  Source
                </Label>
                <Select
                  value={editDetailsForm.source}
                  onValueChange={(v) => setEditDetailsForm((p) => ({ ...p, source: v || "Other" }))}
                >
                  <SelectTrigger id="edit-source" className="h-11 bg-card/50 focus-visible:bg-background transition-colors">
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

            <div className="space-y-6">
              {/* Seniority */}
              <div className="space-y-2">
                <Label htmlFor="edit-seniority" className="text-sm font-semibold">
                  Seniority Level
                </Label>
                <Input
                  id="edit-seniority"
                  value={editDetailsForm.seniorityLevel}
                  onChange={(e) =>
                    setEditDetailsForm((p) => ({ ...p, seniorityLevel: e.target.value }))
                  }
                  placeholder="e.g. Junior, Senior"
                  className="h-11 bg-card/50 focus-visible:bg-background transition-colors"
                />
              </div>

              {/* Salary */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Salary Range</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={editDetailsForm.salaryMin ? Number(editDetailsForm.salaryMin).toLocaleString("en-US") : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setEditDetailsForm((p) => ({ ...p, salaryMin: raw }));
                    }}
                    placeholder="Min"
                    className="h-11 bg-card/50 focus-visible:bg-background transition-colors flex-1"
                  />
                  <span className="text-muted-foreground text-xs font-semibold px-1">to</span>
                  <Input
                    type="text"
                    value={editDetailsForm.salaryMax ? Number(editDetailsForm.salaryMax).toLocaleString("en-US") : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setEditDetailsForm((p) => ({ ...p, salaryMax: raw }));
                    }}
                    placeholder="Max"
                    className="h-11 bg-card/50 focus-visible:bg-background transition-colors flex-1"
                  />
                  <Select
                    value={editDetailsForm.currency}
                    onValueChange={(v) =>
                      setEditDetailsForm((p) => ({ ...p, currency: v || "USD" }))
                    }
                  >
                    <SelectTrigger className="h-11 bg-card/50 focus-visible:bg-background transition-colors w-24">
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
          </CardContent>
        </Card>

        {/* Description Card */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Job Description</CardTitle>
            <CardDescription>The full text of the job posting.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Textarea
                id="edit-desc"
                value={editDetailsForm.jobDescription}
                onChange={(e) =>
                  setEditDetailsForm((p) => ({ ...p, jobDescription: e.target.value }))
                }
                placeholder="Paste the job description..."
                className="min-h-[300px] font-mono text-sm bg-card/50 focus-visible:bg-background transition-colors p-4 resize-y leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6">
          <Button type="button" variant="outline" size="lg" onClick={() => router.push(`/applications/${applicationId}`)}>
            Cancel
          </Button>
          <Button form="edit-app-form" type="submit" size="lg" disabled={isUpdatingDetails} className="px-8 shadow-sm">
            {isUpdatingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
