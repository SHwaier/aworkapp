import { generateStructured, type AiUsageStats } from "@/lib/ai/client";
import { aiAnalysisSchema, clampOutput } from "./schema";
import { buildUserPrompt, MAX_RESUME_CHARS, SYSTEM_PROMPT, truncateLines } from "./prompt";
import { computeScore, verifyKeywords, verifyRequirements, verifySuggestions } from "./verify";
import { runFormatChecks } from "./format-checks";
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
 * Analyze one resume against one job: a single structured AI call, then
 * deterministic verification of every claim and a computed score.
 */
export async function analyzeResumeMatch(
  input: AnalyzeInput
): Promise<{ result: AnalysisResult; model: string; usage: AiUsageStats }> {
  const allLines = input.resumeText.split("\n").filter(Boolean);
  const lines = truncateLines(allLines, MAX_RESUME_CHARS);

  const {
    data: raw,
    model,
    usage,
  } = await generateStructured({
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt({
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      jobDescription: input.jobDescription,
      resumeLines: lines,
    }),
    schema: aiAnalysisSchema,
  });
  const data = clampOutput(raw);

  const requirements = verifyRequirements(data.requirements, lines);

  return {
    model,
    usage,
    result: {
      score: computeScore(requirements),
      summary: data.summary,
      requirements,
      keywords: verifyKeywords(data.keywords, input.resumeText),
      suggestions: verifySuggestions(data.suggestions, lines),
      formatChecks: runFormatChecks(allLines, input.pageCount),
    },
  };
}
