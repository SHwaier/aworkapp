"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Target,
  FileCheck,
  User,
  GraduationCap,
  Wrench,
  FolderKanban,
  Briefcase,
  List,
  Pen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Lightbulb,
  CircleAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description?: string;
  status: string;
  severity: string;
  isAutoDetected: boolean;
  isUserDismissible: boolean;
  relatedKeyword?: string;
  suggestion?: string;
}

interface ChecklistKeyword {
  id: string;
  keyword: string;
  category: string;
  requirementLevel: string;
  appearsInJob: boolean;
  appearsInResume: boolean;
  recommendation: string;
  frequency: number;
}

interface ChecklistData {
  id: string;
  items: ChecklistItem[];
  keywords: ChecklistKeyword[];
  overallScore: number;
  lastAnalyzedAt: string | null;
}

interface ResumeChecklistProps {
  applicationId: string;
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  companyName: string;
  getResumeText?: () => Promise<string>;
}

// ─── Category Config ───

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  job_match: { label: "Job Match", icon: Target },
  ats_formatting: { label: "ATS", icon: FileCheck },
  header: { label: "Header", icon: User },
  education: { label: "Education", icon: GraduationCap },
  skills: { label: "Skills", icon: Wrench },
  projects: { label: "Projects", icon: FolderKanban },
  experience: { label: "Experience", icon: Briefcase },
  bullet_quality: { label: "Bullets", icon: List },
  action_verbs: { label: "Verbs", icon: Pen },
  final_review: { label: "Final", icon: CheckCircle2 },
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  critical: { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", icon: CircleAlert },
  warning: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", icon: AlertTriangle },
  suggestion: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", icon: Lightbulb },
  info: { color: "text-muted-foreground", bg: "bg-muted/40", icon: Info },
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "To Do",
  in_progress: "In Progress",
  complete: "Done",
  needs_review: "Review",
  ignored: "Ignored",
  not_applicable: "N/A",
};

// ─── Component ───

export function ResumeChecklist({
  applicationId,
  resumeText,
  jobDescription,
  jobTitle,
  companyName,
  getResumeText,
}: ResumeChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showKeywords, setShowKeywords] = useState(false);
  const lastAnalyzedTextRef = useRef<string | null>(null);

  // Load existing checklist
  const loadChecklist = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/resume/checklist`);
      const data = await res.json();
      if (data.success && data.data?.checklist) {
        setChecklist(data.data.checklist);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setAiAnalyzing(true);
    try {
      const textToAnalyze = getResumeText ? await getResumeText() : resumeText;
      
      if (lastAnalyzedTextRef.current === textToAnalyze) {
        toast.info("No changes detected in the resume since the last analysis.");
        setAnalyzing(false);
        setAiAnalyzing(false);
        return;
      }

      // Phase 1: Static analysis (Fast)
      const resStatic = await fetch(`/api/applications/${applicationId}/resume/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: textToAnalyze, mode: "static" }),
      });
      const dataStatic = await resStatic.json();
      
      if (dataStatic.success && dataStatic.data?.checklist) {
        setChecklist(dataStatic.data.checklist);
        setAnalyzing(false); // Stop main loading indicator, show UI
      } else {
        toast.error(dataStatic.error || "Analysis failed");
        setAnalyzing(false);
        setAiAnalyzing(false);
        return;
      }

      // Phase 2: AI Analysis (Slow)
      const resAi = await fetch(`/api/applications/${applicationId}/resume/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: textToAnalyze, mode: "ai" }),
      });
      const dataAi = await resAi.json();
      
      if (dataAi.success && dataAi.data?.checklist) {
        setChecklist(dataAi.data.checklist);
        lastAnalyzedTextRef.current = textToAnalyze;
        toast.success("Resume completely analyzed");
      } else {
        toast.error(dataAi.error || "AI Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze resume");
    } finally {
      setAnalyzing(false);
      setAiAnalyzing(false);
    }
  }, [applicationId, resumeText, getResumeText]);

  // Update item status
  const updateItemStatus = async (itemId: string, status: string) => {
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/resume/checklist/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      if (data.success && data.data?.checklist) {
        setChecklist(data.data.checklist);
      }
    } catch {
      toast.error("Failed to update item");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter items by active tab
  const filteredItems = checklist?.items.filter(
    (item) => activeTab === "all" || item.category === activeTab
  ) || [];

  // Category counts
  const categoryCounts = checklist?.items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const categoryIssueCounts = checklist?.items.reduce((acc, item) => {
    if (!["complete", "ignored", "not_applicable"].includes(item.status)) {
      acc[item.category] = (acc[item.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  // Stats
  const stats = {
    critical: checklist?.items.filter((i) => i.severity === "critical" && !["complete", "ignored", "not_applicable"].includes(i.status)).length || 0,
    warnings: checklist?.items.filter((i) => i.severity === "warning" && !["complete", "ignored", "not_applicable"].includes(i.status)).length || 0,
    suggestions: checklist?.items.filter((i) => i.severity === "suggestion" && !["complete", "ignored", "not_applicable"].includes(i.status)).length || 0,
    completed: checklist?.items.filter((i) => ["complete", "ignored", "not_applicable"].includes(i.status)).length || 0,
  };

  // Keyword stats
  const keywordStats = {
    matched: checklist?.keywords.filter((k) => k.appearsInResume).length || 0,
    missing: checklist?.keywords.filter((k) => !k.appearsInResume).length || 0,
    total: checklist?.keywords.length || 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // No checklist yet — show analyze CTA
  if (!checklist) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-3 py-6">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Resume Checklist</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto">
              Analyze your resume against this job description to get tailored improvement suggestions.
            </p>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={analyzing}
            size="sm"
            className="shadow-md shadow-primary/10"
          >
            {analyzing ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Analyze Resume</>
            )}
          </Button>
        </div>

        {/* Job context */}
        <Card className="border-border/60">
          <CardContent className="p-3 space-y-1 text-xs">
            <p><span className="font-semibold text-foreground">Role:</span> {jobTitle}</p>
            <p><span className="font-semibold text-foreground">Company:</span> {companyName}</p>
          </CardContent>
        </Card>

        {jobDescription && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Job Description</p>
            <div className="text-[11px] text-muted-foreground max-h-[200px] overflow-y-auto whitespace-pre-wrap leading-relaxed bg-background border border-border/60 rounded-lg p-3">
              {jobDescription.slice(0, 1500)}
              {jobDescription.length > 1500 && "..."}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Main Checklist View ───
  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Resume Checklist
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={runAnalysis}
            disabled={analyzing || aiAnalyzing}
            className="h-7 px-2 text-[10px]"
          >
            {(analyzing || aiAnalyzing) ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">
              {checklist.overallScore}% complete
            </span>
            <span className="text-muted-foreground">
              {stats.completed}/{checklist.items.length} items
            </span>
          </div>
          <Progress value={checklist.overallScore} className="h-1.5" />
        </div>

        {/* Quick Stats */}
        <div className="flex gap-2 text-[10px]">
          {stats.critical > 0 && (
            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 py-0 px-1.5">
              {stats.critical} critical
            </Badge>
          )}
          {stats.warnings > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20 py-0 px-1.5">
              {stats.warnings} warning{stats.warnings !== 1 ? "s" : ""}
            </Badge>
          )}
          {stats.suggestions > 0 && (
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/20 py-0 px-1.5">
              {stats.suggestions} suggestion{stats.suggestions !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* AI Analyzing Banner */}
      {aiAnalyzing && (
        <div className="flex items-center gap-2 p-3 text-[11px] rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="font-medium">🤖 AI is generating deep suggestions...</span>
        </div>
      )}

      {/* Keyword Summary Toggle */}
      <button
        onClick={() => setShowKeywords(!showKeywords)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-xs"
      >
        <span className="font-semibold flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-primary" />
          Keywords: {keywordStats.matched}/{keywordStats.total} matched
        </span>
        {showKeywords ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {showKeywords && (
        <div className="flex flex-wrap gap-1 px-1">
          {checklist.keywords.map((kw) => (
            <Badge
              key={kw.id}
              variant="outline"
              className={cn(
                "text-[10px] py-0 px-1.5 transition-all",
                kw.appearsInResume
                  ? "text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : kw.recommendation === "unsupported"
                    ? "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-500/20 dark:bg-red-500/10"
                    : "text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10"
              )}
            >
              {kw.appearsInResume ? <Check className="h-2.5 w-2.5 mr-0.5" /> : null}
              {kw.keyword}
              {kw.frequency > 1 && <span className="opacity-50 ml-0.5">×{kw.frequency}</span>}
            </Badge>
          ))}
        </div>
      )}

      {/* Category Tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-1 pb-1">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all",
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            )}
          >
            All ({checklist.items.length})
          </button>
          {Object.entries(CATEGORY_CONFIG)
            .filter(([key]) => (categoryCounts[key] || 0) > 0)
            .sort(([keyA], [keyB]) => {
              const issuesA = categoryIssueCounts[keyA] || 0;
              const issuesB = categoryIssueCounts[keyB] || 0;
              if (issuesA > 0 && issuesB === 0) return -1;
              if (issuesA === 0 && issuesB > 0) return 1;
              return 0;
            })
            .map(([key, config]) => {
            const issues = categoryIssueCounts[key] || 0;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all flex items-center gap-1",
                  activeTab === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                )}
              >
                {config.label}
                {issues > 0 && activeTab !== key && (
                  <span className="bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full px-1 text-[9px]">
                    {issues}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Checklist Items */}
      <div className="space-y-1.5">
        {filteredItems.map((item) => {
          const sevConfig = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info;
          const SevIcon = sevConfig.icon;
          const isDone = ["complete", "ignored", "not_applicable"].includes(item.status);
          const isExpanded = expandedItems.has(item.id);

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border transition-all overflow-hidden",
                isDone
                  ? "border-border/40 bg-muted/10 opacity-75 grayscale-[0.2]"
                  : "border-border/60 bg-card shadow-xs"
              )}
            >
              {/* Item Header */}
              <button
                onClick={() => toggleExpand(item.id)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left group hover:bg-muted/30 transition-colors"
              >
                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5", sevConfig.bg)}>
                  <SevIcon className={cn("h-3.5 w-3.5", sevConfig.color)} />
                </div>
                <div className="grow min-w-0">
                  <p className={cn(
                    "text-xs font-semibold leading-tight",
                    isDone ? "line-through text-muted-foreground" : "text-foreground"
                  )}>
                    {item.title}
                  </p>
                  {!isExpanded && item.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-medium py-0.5 px-1.5 shrink-0 mt-0.5 whitespace-nowrap",
                    isDone ? "text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10" : ""
                  )}
                >
                  {STATUS_LABELS[item.status] || item.status}
                </Badge>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2.5 border-t border-border/40 pt-2.5 ml-10 mr-2">
                  {item.description && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  {item.suggestion && (
                    <div className="text-[11px] text-primary bg-primary/5 border border-primary/10 rounded-md px-3 py-2">
                      <span className="font-semibold">💡 </span>
                      {item.suggestion}
                    </div>
                  )}

                  {/* Actions */}
                  {item.isUserDismissible && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant={item.status === "complete" ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-[11px] px-2.5 shadow-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateItemStatus(item.id, item.status === "complete" ? "not_started" : "complete");
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" /> Done
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] px-2.5 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateItemStatus(item.id, "ignored");
                        }}
                      >
                        <EyeOff className="h-3 w-3 mr-1" /> Ignore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] px-2.5 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateItemStatus(item.id, "not_applicable");
                        }}
                      >
                        <X className="h-3 w-3 mr-1" /> N/A
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6 italic">
            No items in this category.
          </p>
        )}
      </div>
    </div>
  );
}
