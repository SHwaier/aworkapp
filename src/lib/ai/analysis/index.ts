import {
  AiError,
  generateStructured,
  thinkingEffortFromEnv,
  type AiUsageStats,
} from "@/lib/ai/client";
import { aiAnalysisSchema, clampOutput } from "./schema";
import { buildUserPrompt, MAX_RESUME_CHARS, SYSTEM_PROMPT, truncateLines } from "./prompt";
import {
  bracketUnsupportedTerms,
  resolveLineRefs,
  verifyKeywords,
  verifyRequirements,
  verifySuggestions,
} from "./verify";
import { computeScore } from "./scoring";
import { runFormatChecks } from "./format-checks";
import { generateInsights } from "./insights";
import type { AnalysisResult } from "./types";

export { PROMPT_VERSION } from "./prompt";
export type * from "./types";

export interface AnalyzeInput {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  resumeText: string;
  pageCount: number | null;
}

/**
 * Analyze one resume against one job. Two AI calls run in parallel:
 * - the core match (requirements, keywords, suggestions), whose every claim is
 *   then verified against the resume and scored deterministically;
 * - role insights (benchmarks + action plan) from general hiring knowledge.
 * The core match must succeed; insights are best-effort and may be null.
 */
export async function analyzeResumeMatch(input: AnalyzeInput): Promise<{
  result: AnalysisResult;
  model: string;
  usage: AiUsageStats;
  insightsError: string | null;
}> {
  const allLines = input.resumeText.split("\n").filter(Boolean);
  const lines = truncateLines(allLines, MAX_RESUME_CHARS);
  const promptInput = {
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    jobDescription: input.jobDescription,
    resumeLines: lines,
  };

  const [core, insights] = await Promise.allSettled([
    generateStructured({
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(promptInput),
      schema: aiAnalysisSchema,
      // Unset = model default. GEMINI_THINKING=minimal|low|medium|high
      thinking: thinkingEffortFromEnv("GEMINI_THINKING"),
    }),
    generateInsights(promptInput),
  ]);

  if (core.status === "rejected") throw core.reason;
  const { data: raw, model, usage } = core.value;
  const fix = (t: string) => resolveLineRefs(t, lines);
  const clamped = clampOutput(raw);
  const data = {
    ...clamped,
    summary: fix(clamped.summary),
    requirements: clamped.requirements.map((r) => ({ ...r, note: fix(r.note) })),
    suggestions: clamped.suggestions.map((s) => ({
      ...s,
      title: fix(s.title),
      rationale: fix(s.rationale),
    })),
  };
  const requirements = verifyRequirements(data.requirements, lines);
  const keywords = verifyKeywords(data.keywords, input.resumeText);
  const missingTerms = keywords.filter((k) => !k.inResume).map((k) => k.term);

  let insightsError: string | null = null;
  if (insights.status === "rejected") {
    insightsError =
      insights.reason instanceof AiError
        ? insights.reason.message
        : "Role insights couldn't be generated for this analysis.";
    console.error("Insights generation failed:", insights.reason);
  }
  const insightsUsage = insights.status === "fulfilled" ? insights.value.usage : null;

  return {
    model,
    insightsError,
    usage: {
      inputTokens: usage.inputTokens + (insightsUsage?.inputTokens ?? 0),
      outputTokens: usage.outputTokens + (insightsUsage?.outputTokens ?? 0),
      thoughtTokens: usage.thoughtTokens + (insightsUsage?.thoughtTokens ?? 0),
    },
    result: {
      score: computeScore(requirements),
      summary: data.summary,
      requirements,
      keywords,
      suggestions: verifySuggestions(data.suggestions, lines),
      formatChecks: runFormatChecks(allLines, input.pageCount),
      insights:
        insights.status === "fulfilled"
          ? {
              ...insights.value.data,
              roleSummary: fix(insights.value.data.roleSummary),
              benchmarks: insights.value.data.benchmarks.map((b) => ({
                ...b,
                typical: fix(b.typical),
                gap: fix(b.gap),
                examples: b.examples.map((e) => bracketUnsupportedTerms(e, missingTerms)),
              })),
              actionPlan: insights.value.data.actionPlan.map((step) => ({
                ...step,
                title: fix(step.title),
                detail: fix(step.detail),
              })),
            }
          : null,
    },
  };
}
