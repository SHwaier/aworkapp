import { z } from "zod";
import type { JobProfile } from "./types";

export const REQUIREMENT_CATEGORIES = [
  "skill",
  "experience",
  "education",
  "responsibility",
  "other",
] as const;
const BENCHMARK_AREAS = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
  "keywords",
  "formatting",
] as const;
const LEVEL = z.enum(["high", "medium", "low"]);
const COVERAGE = z.enum(["met", "partial", "missing"]);
const IMPORTANCE = z.enum(["required", "preferred"]);

/*
 * Shapes the model must return. Gemini rejects schemas with many length/count
 * bounds ("too many states"), so these only describe the shape; limits live in
 * the prompt and are enforced afterwards by the clamp functions. Nullable/union
 * types are avoided too: "no line" is 0 and "no quote" is "".
 * Property order is the order the model writes in: facts first, judgments after,
 * the summary last.
 */

const suggestion = z.object({
  type: z.enum([
    "rewrite_bullet",
    "add_keyword",
    "add_content",
    "remove_content",
    "reorder",
    "wording",
  ]),
  priority: LEVEL,
  title: z.string(),
  line: z.number().int(),
  suggestedText: z.string(),
  rationale: z.string(),
  requiresVerification: z.boolean(),
});

const actionStep = z.object({
  title: z.string(),
  detail: z.string(),
  impact: LEVEL,
  effort: LEVEL,
  relatedRequirement: z.string(),
});

const judgment = {
  coverage: COVERAGE,
  evidenceLines: z.array(z.number().int()),
  evidenceQuote: z.string(),
  note: z.string(),
};

/** First analysis of a job: the job profile and the resume match in one call */
export const fullAnalysisSchema = z.object({
  seniority: z.enum(["entry", "mid", "senior", "lead", "unknown"]),
  roleSummary: z.string(),
  requirements: z.array(
    z.object({
      text: z.string(),
      category: z.enum(REQUIREMENT_CATEGORIES),
      importance: IMPORTANCE,
      ...judgment,
    })
  ),
  keywords: z.array(z.object({ term: z.string(), importance: IMPORTANCE })),
  benchmarks: z.array(
    z.object({
      area: z.enum(BENCHMARK_AREAS),
      title: z.string(),
      typical: z.string(),
      yourStatus: z.enum(["strong", "adequate", "weak", "missing"]),
      gap: z.string(),
      example: z.string(),
    })
  ),
  suggestions: z.array(suggestion),
  actionPlan: z.array(actionStep),
  summary: z.string(),
});

/** Re-analysis against a known job profile: only the resume-dependent judgments */
export const matchSchema = z.object({
  requirements: z.array(z.object({ ref: z.number().int(), ...judgment })),
  benchmarks: z.array(
    z.object({
      ref: z.number().int(),
      yourStatus: z.enum(["strong", "adequate", "weak", "missing"]),
      gap: z.string(),
      example: z.string(),
    })
  ),
  suggestions: z.array(suggestion),
  actionPlan: z.array(actionStep),
  summary: z.string(),
});

export type FullAnalysisOutput = z.infer<typeof fullAnalysisSchema>;
export type MatchOutput = z.infer<typeof matchSchema>;

/** Both calls normalize to this before verification */
export type RawAnalysis = Omit<FullAnalysisOutput, "benchmarks"> & {
  benchmarks: (Omit<FullAnalysisOutput["benchmarks"][number], "example"> & {
    examples: string[];
  })[];
};
export type RawRequirement = RawAnalysis["requirements"][number];
export type RawSuggestion = RawAnalysis["suggestions"][number];

export const LIMITS = {
  requirements: 20,
  keywords: 25,
  benchmarks: 7,
  suggestions: 8,
  actionPlan: 6,
} as const;

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** The job-only part of a full analysis, for reuse with later resume versions */
export function profileFrom(out: RawAnalysis): JobProfile {
  return {
    seniority: out.seniority,
    roleSummary: out.roleSummary,
    requirements: out.requirements.map(({ text, category, importance }) => ({
      text,
      category,
      importance,
    })),
    keywords: out.keywords,
    benchmarks: out.benchmarks.map(({ area, title, typical }) => ({ area, title, typical })),
  };
}

export function fromFull(out: FullAnalysisOutput): RawAnalysis {
  return {
    ...out,
    benchmarks: out.benchmarks.map(({ example, ...b }) => ({
      ...b,
      examples: example.trim() ? [example] : [],
    })),
  };
}

/**
 * Combine a known profile with a match. Requirements and benchmarks are joined
 * by their 1-based ref; any the model skipped are treated as not shown
 * (missing / weak) rather than guessed.
 */
export function fromMatch(profile: JobProfile, out: MatchOutput): RawAnalysis {
  const reqByRef = new Map(out.requirements.map((r) => [r.ref, r]));
  const benchByRef = new Map(out.benchmarks.map((b) => [b.ref, b]));
  return {
    seniority: profile.seniority,
    roleSummary: profile.roleSummary,
    keywords: profile.keywords,
    requirements: profile.requirements.map((req, i) => {
      const j = reqByRef.get(i + 1);
      return {
        ...req,
        coverage: j?.coverage ?? "missing",
        evidenceLines: j?.evidenceLines ?? [],
        evidenceQuote: j?.evidenceQuote ?? "",
        note: j?.note ?? "",
      };
    }),
    benchmarks: profile.benchmarks.map((b, i) => {
      const j = benchByRef.get(i + 1);
      return {
        ...b,
        yourStatus: j?.yourStatus ?? "weak",
        gap: j?.gap ?? "",
        examples: j?.example.trim() ? [j.example] : [],
      };
    }),
    suggestions: out.suggestions,
    actionPlan: out.actionPlan,
    summary: out.summary,
  };
}

/** Enforce size limits on model output (trim rather than reject). */
export function clampOutput(out: RawAnalysis): RawAnalysis {
  return {
    seniority: out.seniority,
    roleSummary: clip(out.roleSummary, 300),
    summary: clip(out.summary, 600),
    requirements: out.requirements.slice(0, LIMITS.requirements).map((r) => ({
      ...r,
      text: clip(r.text, 300),
      evidenceLines: r.evidenceLines.slice(0, 5),
      evidenceQuote: clip(r.evidenceQuote, 300),
      note: clip(r.note, 300),
    })),
    keywords: out.keywords.slice(0, LIMITS.keywords).map((k) => ({ ...k, term: clip(k.term, 60) })),
    benchmarks: out.benchmarks.slice(0, LIMITS.benchmarks).map((b) => ({
      ...b,
      title: clip(b.title, 100),
      typical: clip(b.typical, 500),
      gap: clip(b.gap, 400),
      examples: b.examples.slice(0, 2).map((e) => clip(e, 300)),
    })),
    suggestions: out.suggestions.slice(0, LIMITS.suggestions).map((s) => ({
      ...s,
      title: clip(s.title, 140),
      suggestedText: clip(s.suggestedText, 600),
      rationale: clip(s.rationale, 400),
    })),
    actionPlan: out.actionPlan.slice(0, LIMITS.actionPlan).map((a) => ({
      ...a,
      title: clip(a.title, 120),
      detail: clip(a.detail, 400),
      relatedRequirement: clip(a.relatedRequirement, 200),
    })),
  };
}
