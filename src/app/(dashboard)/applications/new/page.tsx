"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Briefcase,
  Check,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  MapPin,
  Sparkles,
  SkipForward,
  Pencil,
} from "lucide-react";
import {
  APPLICATION_STATUSES,
  WORK_MODES,
  EMPLOYMENT_TYPES,
  JOB_SOURCES,
} from "@/lib/validators/schemas";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface Company {
  _id?: string;
  id?: string;
  name: string;
  industry?: string;
}

interface ParsedData {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  location: string;
  workMode: string;
  employmentType: string;
  source: string;
}

const STEPS = [
  { id: 1, label: "Link", icon: Link2 },
  { id: 2, label: "Role", icon: Briefcase },
  { id: 3, label: "Details", icon: MapPin },
  { id: 4, label: "Review", icon: Check },
];

export default function NewApplicationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseWarning, setParseWarning] = useState("");
  const [wasAutofilled, setWasAutofilled] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [focusedCompanyIndex, setFocusedCompanyIndex] = useState(-1);
  const [parseProgress, setParseProgress] = useState(0);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ id: string; jobTitle: string; companyName: string } | null>(null);

  // Form state
  const [jobUrl, setJobUrl] = useState("");
  const [companySearchText, setCompanySearchText] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const companyRef = useRef<HTMLDivElement>(null);
  const parseAbortControllerRef = useRef<AbortController | null>(null);

  // Cleanup parse abort on unmount
  useEffect(() => {
    return () => {
      if (parseAbortControllerRef.current) {
        parseAbortControllerRef.current.abort();
      }
    };
  }, []);

  const [form, setForm] = useState({
    jobTitle: "",
    jobDescription: "",
    location: "",
    workMode: "" as string,
    employmentType: "" as string,
    source: "Other" as string,
    currentStatus: "Saved" as string,
    salaryMin: "" as string | number,
    salaryMax: "" as string | number,
    currency: "USD",
    seniorityLevel: "",
  });

  // Fetch companies for autocomplete
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies?limit=100");
      const data = await res.json();
      if (data.success) setCompanies(data.data.companies);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredSuggestions = companySearchText.trim()
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(companySearchText.toLowerCase())
      )
    : companies;

  // ─── URL parsing ───
  async function handleParseUrl() {
    if (!jobUrl.trim()) {
      goToStep(2);
      return;
    }

    if (parseAbortControllerRef.current) {
      parseAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    parseAbortControllerRef.current = controller;

    setIsParsing(true);
    setParseWarning("");
    setParseProgress(10);
    const interval = setInterval(() => {
      setParseProgress((p) => {
        if (p >= 90) return p;
        return p + Math.floor(Math.random() * 8) + 3;
      });
    }, 250);

    try {
      const res = await fetch("/api/applications/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
        signal: controller.signal,
      });
      const data = await res.json();
      setParseProgress(100);
      clearInterval(interval);
      if (data.success && data.data) {
        const p: ParsedData = data.data;
        const hasData = p.jobTitle || p.companyName || p.location;
        setForm((prev) => ({
          ...prev,
          jobTitle: p.jobTitle || prev.jobTitle,
          jobDescription: p.jobDescription || prev.jobDescription,
          location: p.location || prev.location,
          workMode: p.workMode || prev.workMode,
          employmentType: p.employmentType || prev.employmentType,
          source: p.source || prev.source,
          salaryMin: (p as any).salaryMin !== null && (p as any).salaryMin !== undefined ? (p as any).salaryMin : prev.salaryMin,
          salaryMax: (p as any).salaryMax !== null && (p as any).salaryMax !== undefined ? (p as any).salaryMax : prev.salaryMax,
          currency: (p as any).currency || prev.currency,
        }));
        if (p.companyName) {
          setCompanySearchText(p.companyName);
          const match = companies.find(
            (c) => c.name.toLowerCase() === p.companyName.toLowerCase()
          );
          if (match) setCompanyId(match.id || match._id || "");
        }
        if (hasData) {
          setWasAutofilled(true);
          toast.success("Job details extracted successfully!");
        }
        if (data.warning) setParseWarning(data.warning);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Failed to parse URL");
      }
    } finally {
      clearInterval(interval);
      setIsParsing(false);
      goToStep(2);
      if (parseAbortControllerRef.current === controller) {
        parseAbortControllerRef.current = null;
      }
    }
  }

  function goToStep(s: number) {
    setStep(s);
  }

  async function handleNext() {
    if (step === 2) {
      if (!companySearchText.trim() || !form.jobTitle.trim()) {
        setShowValidationErrors(true);
        if (!companySearchText.trim() && !form.jobTitle.trim()) {
          toast.error("Company name and Job title are required");
        } else if (!companySearchText.trim()) {
          toast.error("Company name is required");
        } else {
          toast.error("Job title is required");
        }
        return;
      }
    }

    if (step === 3) {
      setIsCheckingDuplicate(true);
      try {
        const res = await fetch("/api/applications/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobUrl: jobUrl || undefined,
            jobTitle: form.jobTitle,
            jobDescription: form.jobDescription,
          }),
        });
        const data = await res.json();
        if (data.success && data.data?.duplicate) {
          setDuplicateInfo(data.data.application);
          setShowDuplicateDialog(true);
          setIsCheckingDuplicate(false);
          return;
        }
      } catch (err) {
        // Fallback: ignore duplicate check error to let user continue
      } finally {
        setIsCheckingDuplicate(false);
      }
    }

    setShowValidationErrors(false);
    goToStep(step + 1);
  }

  // ─── Submit ───
  async function handleSubmit() {
    if (!form.jobTitle.trim()) {
      toast.error("Job title is required");
      return;
    }
    setIsSubmitting(true);
    try {
      let finalCompanyId = companyId;
      // Create company if needed
      if (!finalCompanyId && companySearchText.trim()) {
        const match = companies.find(
          (c) => c.name.toLowerCase() === companySearchText.trim().toLowerCase()
        );
        if (match) {
          finalCompanyId = match.id || match._id || "";
        } else {
          const compRes = await fetch("/api/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: companySearchText.trim() }),
          });
          const compData = await compRes.json();
          if (!compRes.ok) throw new Error(compData.error);
          finalCompanyId = compData.data.company.id || compData.data.company._id || "";
        }
      }
      if (!finalCompanyId) {
        toast.error("Please enter a company name");
        setIsSubmitting(false);
        goToStep(2);
        return;
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyId: finalCompanyId,
          jobUrl: jobUrl || undefined,
          workMode: form.workMode || undefined,
          employmentType: form.employmentType || undefined,
          salaryMin: form.salaryMin !== "" ? Number(form.salaryMin) : undefined,
          salaryMax: form.salaryMax !== "" ? Number(form.salaryMax) : undefined,
          currency: form.currency || "USD",
          seniorityLevel: form.seniorityLevel || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Application logged! ✨");
      router.push(`/applications/${data.data.application.id || data.data.application._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Step validation ───
  function canProceed(): boolean {
    if (step === 2) return !!form.jobTitle.trim() && !!companySearchText.trim();
    return true;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/applications")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-extrabold tracking-tight">New Application</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {step === 1 && "Start by pasting the job posting link to auto-fill details."}
          {step === 2 && "Confirm the company and role."}
          {step === 3 && "Add any extra details — all optional."}
          {step === 4 && "Review everything before logging."}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => isCompleted && goToStep(s.id)}
                disabled={!isCompleted}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : isCompleted
                    ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/15"
                    : "bg-muted/40 text-muted-foreground/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-1.5 rounded-full transition-colors ${
                    step > s.id ? "bg-primary/40" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ═══════════ STEP 1: URL ═══════════ */}
      {step === 1 && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 p-8 sm:p-10 text-center space-y-6">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Paste the Job Link</h2>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                  Drop a link from LinkedIn, Indeed, or any job board to automatically extract role and company details.
                </p>
              </div>

              <div className="max-w-lg mx-auto space-y-3">
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="parse-url-input"
                    type="url"
                    placeholder="https://linkedin.com/jobs/view/..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleParseUrl())}
                    className="pl-10 h-12 text-base bg-card shadow-sm"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleParseUrl}
                    disabled={isParsing}
                    className="flex-1 h-11 text-sm font-semibold shadow-md shadow-primary/10"
                    id="parse-url-btn"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extracting details...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {jobUrl.trim() ? "Extract & Continue" : "Continue"}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (parseAbortControllerRef.current) {
                        parseAbortControllerRef.current.abort();
                      }
                      setIsParsing(false);
                      goToStep(2);
                    }}
                    className="h-11 text-sm text-muted-foreground"
                    id="skip-url-btn"
                  >
                    <SkipForward className="mr-1.5 h-4 w-4" />
                    Skip
                  </Button>
                </div>

                {isParsing && (
                  <div className="space-y-2 mt-4 text-left max-w-lg mx-auto">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Analyzing job description...</span>
                      <span>{parseProgress}%</span>
                    </div>
                    <Progress value={parseProgress} className="h-1.5" />
                  </div>
                )}
              </div>

              {parseWarning && (
                <p className="text-xs text-warning-foreground bg-warning/10 px-3 py-2 rounded-lg inline-block">
                  {parseWarning}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ STEP 2: COMPANY & ROLE ═══════════ */}
      {step === 2 && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {wasAutofilled && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/10 px-3 py-2 rounded-lg font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Fields auto-filled from URL — edit as needed
              </div>
            )}

            {/* Company */}
            <div className="space-y-1.5 relative" ref={companyRef}>
              <Label htmlFor="wizard-company" className="text-sm font-semibold">
                Company <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="wizard-company"
                  placeholder="Type company name (e.g. Google, Stripe...)"
                  value={companySearchText}
                  onChange={(e) => {
                    setCompanySearchText(e.target.value);
                    setShowSuggestions(true);
                    setCompanyId("");
                    setFocusedCompanyIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (!showSuggestions || filteredSuggestions.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setFocusedCompanyIndex((prev) =>
                        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setFocusedCompanyIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
                      );
                    } else if (e.key === "Enter") {
                      if (focusedCompanyIndex >= 0 && focusedCompanyIndex < filteredSuggestions.length) {
                        e.preventDefault();
                        const selected = filteredSuggestions[focusedCompanyIndex];
                        setCompanySearchText(selected.name);
                        setCompanyId(selected.id || selected._id || "");
                        setShowSuggestions(false);
                        setFocusedCompanyIndex(-1);
                      }
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                      setFocusedCompanyIndex(-1);
                    }
                  }}
                  className={cn(
                    "pl-9 h-11 bg-card",
                    showValidationErrors && !companySearchText.trim() && "border-destructive ring-destructive/20 focus-visible:ring-destructive/30"
                  )}
                />
              </div>
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 border border-border bg-popover text-popover-foreground rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredSuggestions.map((c, idx) => (
                    <button
                      key={c.id || c._id}
                      type="button"
                      onClick={() => {
                        setCompanySearchText(c.name);
                        setCompanyId(c.id || c._id || "");
                        setShowSuggestions(false);
                        setFocusedCompanyIndex(-1);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm font-medium border-b border-border/30 last:border-0 flex items-center justify-between transition-colors ${
                        idx === focusedCompanyIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <span className="font-semibold">{c.name}</span>
                      {c.industry && (
                        <span className="text-muted-foreground text-xs">{c.industry}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {companySearchText.trim() &&
                !companyId &&
                filteredSuggestions.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-primary font-medium">&quot;{companySearchText.trim()}&quot;</span> will be created as a new company.
                  </p>
                )}
            </div>

            {/* Job Title */}
            <div className="space-y-1.5">
              <Label htmlFor="wizard-title" className="text-sm font-semibold">
                Job Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-title"
                placeholder="e.g. Software Engineer"
                value={form.jobTitle}
                onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
                className={cn(
                  "h-11 bg-card",
                  showValidationErrors && !form.jobTitle.trim() && "border-destructive ring-destructive/20 focus-visible:ring-destructive/30"
                )}
              />
            </div>

            {/* URL display if set */}
            {jobUrl && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{jobUrl}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════ STEP 3: DETAILS ═══════════ */}
      {step === 3 && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="wizard-location" className="text-sm font-semibold">Location</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                </div>
                <LocationAutocomplete
                  id="wizard-location"
                  value={form.location}
                  onChange={(v) => setForm((p) => ({ ...p, location: v }))}
                  placeholder="e.g. Toronto, ON"
                  className="h-10 bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="wizard-workmode" className="text-sm font-semibold">Work Mode</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                </div>
                <Select
                  value={form.workMode}
                  onValueChange={(v) => setForm((p) => ({ ...p, workMode: v || "" }))}
                >
                  <SelectTrigger id="wizard-workmode" className="h-10 bg-card">
                    <SelectValue>
                      {form.workMode
                        ? form.workMode.charAt(0).toUpperCase() + form.workMode.slice(1)
                        : "Select"}
                    </SelectValue>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="wizard-emptype" className="text-sm font-semibold">Employment Type</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                </div>
                <Select
                  value={form.employmentType}
                  onValueChange={(v) => setForm((p) => ({ ...p, employmentType: v || "" }))}
                >
                  <SelectTrigger id="wizard-emptype" className="h-10 bg-card">
                    <SelectValue>
                      {form.employmentType
                        ? form.employmentType.charAt(0).toUpperCase() + form.employmentType.slice(1)
                        : "Select"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="wizard-source" className="text-sm font-semibold">Source</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                </div>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm((p) => ({ ...p, source: v || "" }))}
                >
                  <SelectTrigger id="wizard-source" className="h-10 bg-card">
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

            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline w-full sm:w-1/2">
                <Label htmlFor="wizard-status" className="text-sm font-semibold">Initial Status</Label>
                <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
              </div>
              <Select
                value={form.currentStatus}
                onValueChange={(v) => setForm((p) => ({ ...p, currentStatus: v || "" }))}
              >
                <SelectTrigger id="wizard-status" className="h-10 bg-card w-full sm:w-1/2">
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
              <div className="flex justify-between items-baseline">
                <Label htmlFor="wizard-joburl" className="text-sm font-semibold">Job URL</Label>
                <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
              </div>
              <Input
                id="wizard-joburl"
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://linkedin.com/jobs/view/..."
                className="h-10 bg-card"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="wizard-seniority" className="text-sm font-semibold">Seniority Level</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                </div>
                <Input
                  id="wizard-seniority"
                  value={form.seniorityLevel}
                  onChange={(e) => setForm((p) => ({ ...p, seniorityLevel: e.target.value }))}
                  placeholder="e.g. Junior, Senior, Lead"
                  className="h-10 bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Label className="text-sm font-semibold">Salary Range</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={form.salaryMin}
                    onChange={(e) => setForm((p) => ({ ...p, salaryMin: e.target.value }))}
                    placeholder="Min"
                    className="h-10 bg-card flex-1"
                  />
                  <span className="text-muted-foreground text-xs font-semibold px-0.5">to</span>
                  <Input
                    type="number"
                    value={form.salaryMax}
                    onChange={(e) => setForm((p) => ({ ...p, salaryMax: e.target.value }))}
                    placeholder="Max"
                    className="h-10 bg-card flex-1"
                  />
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm((p) => ({ ...p, currency: v || "USD" }))}
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

            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <Label htmlFor="wizard-desc" className="text-sm font-semibold">Job Description</Label>
                <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
              </div>
              <Textarea
                id="wizard-desc"
                value={form.jobDescription}
                onChange={(e) => setForm((p) => ({ ...p, jobDescription: e.target.value }))}
                placeholder="Paste or type the job description..."
                rows={4}
                className="bg-card"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ STEP 4: REVIEW ═══════════ */}
      {step === 4 && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Review Application</h2>
              <Badge variant="secondary" className="text-xs">{form.currentStatus}</Badge>
            </div>

            <div className="divide-y divide-border/40">
              {/* Company & Role */}
              <div className="pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company & Role</span>
                  <button onClick={() => goToStep(2)} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-base">{form.jobTitle || "—"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {companySearchText || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</span>
                  <button onClick={() => goToStep(3)} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Location", form.location],
                    ["Work Mode", form.workMode ? form.workMode.charAt(0).toUpperCase() + form.workMode.slice(1) : ""],
                    ["Employment", form.employmentType ? form.employmentType.charAt(0).toUpperCase() + form.employmentType.slice(1) : ""],
                    ["Source", form.source],
                    ["Seniority", form.seniorityLevel],
                    ["Salary Range", (form.salaryMin || form.salaryMax) ? `${form.salaryMin ? `${form.currency} ${Number(form.salaryMin).toLocaleString()}` : "—"} to ${form.salaryMax ? `${form.currency} ${Number(form.salaryMax).toLocaleString()}` : "—"}` : ""],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium">{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* URL & Description */}
              {(jobUrl || form.jobDescription) && (
                <div className="pt-4 space-y-2">
                  {jobUrl && (
                    <div className="flex items-center gap-2 text-xs bg-muted/30 px-3 py-2 rounded-lg">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary truncate hover:underline"
                      >
                        {jobUrl}
                      </a>
                    </div>
                  )}
                  {form.jobDescription && (
                    <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg max-h-28 overflow-y-auto leading-relaxed">
                      {form.jobDescription.slice(0, 500)}
                      {form.jobDescription.length > 500 && "..."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ NAVIGATION BAR ═══════════ */}
      {step > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => goToStep(step - 1)}
            className="h-11"
            id="wizard-back-btn"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>

          {step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={isCheckingDuplicate}
              className="h-11 px-6 shadow-md shadow-primary/10"
              id="wizard-next-btn"
            >
              {isCheckingDuplicate ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11 px-8 shadow-md shadow-primary/10"
              id="wizard-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Log Application
                </>
              )}
            </Button>
          )}
        </div>
      )}
      {/* Duplicate Warning Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Application</DialogTitle>
            <DialogDescription>
              We detected an existing application for <strong>{duplicateInfo?.jobTitle}</strong> at <strong>{duplicateInfo?.companyName}</strong>. 
              Applying twice to the same job might cause confusion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between flex-row-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDuplicateDialog(false);
                goToStep(4);
              }}
              id="duplicate-ignore-btn"
            >
              Ignore & Continue
            </Button>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowDuplicateDialog(false)}
                id="duplicate-cancel-btn"
              >
                Cancel
              </Button>
              {duplicateInfo?.id && (
                <Button
                  onClick={() => {
                    setShowDuplicateDialog(false);
                    router.push(`/applications/${duplicateInfo.id}`);
                  }}
                  id="duplicate-view-btn"
                >
                  View Existing
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
