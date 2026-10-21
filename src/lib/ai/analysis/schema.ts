import { z } from "zod";

export const REQUIREMENT_CATEGORIES = [
  "skill",
  "experience",
  "education",
  "responsibility",
  "other",
] as const;

/**
 * Shape the model must return. Gemini rejects schemas with many length/count
 * bounds ("too many states"), so this only describes the shape; limits live in
 * the prompt and are enforced afterwards by `clampOutput`. Nullable/union types
 * are avoided too: "no line" is 0 and "no quote" is "".
 */
export const aiAnalysisSchema = z.object({
  summary: z.string(),
  requirements: z.array(
    z.object({
      text: z.string(),
      category: z.enum(REQUIREMENT_CATEGORIES),
      importance: z.enum(["required", "preferred"]),
      coverage: z.enum(["met", "partial", "missing"]),
      evidenceLines: z.array(z.number().int()),
      evidenceQuote: z.string(),
      note: z.string(),
    })
  ),
  keywords: z.array(
    z.object({
      term: z.string(),
      importance: z.enum(["required", "preferred"]),
    })
  ),
  suggestions: z.array(
    z.object({
      type: z.enum([
        "rewrite_bullet",
        "add_keyword",
        "add_content",
        "remove_content",
        "reorder",
        "wording",
      ]),
      priority: z.enum(["high", "medium", "low"]),
      title: z.string(),
      line: z.number().int(),
      suggestedText: z.string(),
      rationale: z.string(),
      requiresVerification: z.boolean(),
    })
  ),
});

export type AiAnalysisOutput = z.infer<typeof aiAnalysisSchema>;

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** Enforce size limits on model output (trim rather than reject). */
export function clampOutput(out: AiAnalysisOutput): AiAnalysisOutput {
  return {
    summary: clip(out.summary, 600),
    requirements: out.requirements.slice(0, 25).map((r) => ({
      ...r,
      text: clip(r.text, 300),
      evidenceLines: r.evidenceLines.slice(0, 5),
      evidenceQuote: clip(r.evidenceQuote, 300),
      note: clip(r.note, 300),
    })),
    keywords: out.keywords.slice(0, 30).map((k) => ({ ...k, term: clip(k.term, 60) })),
    suggestions: out.suggestions.slice(0, 15).map((s) => ({
      ...s,
      title: clip(s.title, 140),
      suggestedText: clip(s.suggestedText, 600),
      rationale: clip(s.rationale, 400),
    })),
  };
}
