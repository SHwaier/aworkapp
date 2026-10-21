export type Importance = "required" | "preferred";
export type Coverage = "met" | "partial" | "missing";
export type SuggestionType =
  | "rewrite_bullet"
  | "add_keyword"
  | "add_content"
  | "remove_content"
  | "reorder"
  | "wording";

export interface AnalysisRequirement {
  text: string;
  importance: Importance;
  coverage: Coverage;
  /** Coverage the model claimed, before evidence verification */
  claimedCoverage: Coverage;
  /** Resume text backing the judgment, taken from the resume itself (never the model) */
  evidence: string;
  evidenceVerified: boolean;
  note: string;
}

export interface AnalysisKeyword {
  term: string;
  importance: Importance;
  /** Computed by whole-word matching against the resume, not by the model */
  inResume: boolean;
}

export interface AnalysisSuggestion {
  type: SuggestionType;
  priority: "high" | "medium" | "low";
  title: string;
  /** For rewrite_bullet: the resume line being replaced, copied from the resume */
  original: string;
  suggestedText: string;
  rationale: string;
  requiresVerification: boolean;
}

export interface FormatCheck {
  id: string;
  label: string;
  status: "pass" | "warn";
  detail: string;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  requirements: AnalysisRequirement[];
  keywords: AnalysisKeyword[];
  suggestions: AnalysisSuggestion[];
  formatChecks: FormatCheck[];
}
