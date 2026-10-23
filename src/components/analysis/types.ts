// Client-side shapes of GET /api/applications/:id/analysis

import type {
  AnalysisInsights,
  AnalysisKeyword,
  AnalysisRequirement,
  FormatCheck,
} from "@/lib/ai/analysis/types";

export type SuggestionStatus = "open" | "done" | "dismissed";

export interface Suggestion {
  id: string;
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  original: string;
  suggestedText: string;
  rationale: string;
  requiresVerification: boolean;
  status: SuggestionStatus;
}

export interface Analysis {
  id: string;
  status: "queued" | "running" | "complete" | "failed";
  error: string | null;
  score: number | null;
  summary: string;
  resumeVersionName: string;
  /** Older analyses may lack `category` */
  requirements: (Omit<AnalysisRequirement, "category"> & {
    category?: AnalysisRequirement["category"];
  })[];
  keywords: AnalysisKeyword[];
  suggestions: Suggestion[];
  formatChecks: FormatCheck[];
  insights?: AnalysisInsights | null;
  insightsError?: string | null;
  /** Copied from an earlier analysis of the same resume text and job (no AI call) */
  reused?: boolean;
  /** Made by the backup model because the main one was busy or out of quota */
  usedFallback?: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface HistoryPoint {
  id: string;
  score: number | null;
  resumeVersionName: string;
  createdAt: string;
}

export interface Overview {
  analysis: Analysis | null;
  /** Previous complete analysis, while the latest is running or failed */
  lastComplete: Analysis | null;
  history: HistoryPoint[];
  ready: boolean;
  reason: string | null;
  upToDate: boolean;
  quota: { used: number; limit: number | null; resetsAt: string };
}
