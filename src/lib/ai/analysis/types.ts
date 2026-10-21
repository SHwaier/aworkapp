export type Importance = "required" | "preferred";
export type RequirementCategory = "skill" | "experience" | "education" | "responsibility" | "other";
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
  category: RequirementCategory;
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

// ─── Insights: AI general knowledge about the role (never other users' data) ───

export type BenchmarkArea =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "keywords"
  | "formatting";
export type BenchmarkStatus = "strong" | "adequate" | "weak" | "missing";
export type Level = "high" | "medium" | "low";

export interface Benchmark {
  area: BenchmarkArea;
  title: string;
  /** What strong candidates for this kind of role typically include */
  typical: string;
  yourStatus: BenchmarkStatus;
  /** How this resume differs from the typical strong resume */
  gap: string;
  /** AI-written illustrative phrasing (placeholders in [brackets]) */
  examples: string[];
}

export interface ActionStep {
  title: string;
  detail: string;
  impact: Level;
  effort: Level;
  /** Text of the requirement this step addresses, if any */
  relatedRequirement: string;
}

export interface AnalysisInsights {
  seniority: "entry" | "mid" | "senior" | "lead" | "unknown";
  roleSummary: string;
  benchmarks: Benchmark[];
  actionPlan: ActionStep[];
}

export interface AnalysisResult {
  score: number;
  summary: string;
  requirements: AnalysisRequirement[];
  keywords: AnalysisKeyword[];
  suggestions: AnalysisSuggestion[];
  formatChecks: FormatCheck[];
  /** null when the insights call failed; the core analysis is still valid */
  insights: AnalysisInsights | null;
}
