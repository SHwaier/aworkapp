import { generateStructured, thinkingEffortFromEnv, type AiUsageStats } from "@/lib/ai/client";
import {
  clampOutput,
  fromFull,
  fromMatch,
  fullAnalysisSchema,
  matchSchema,
  profileFrom,
  type RawAnalysis,
} from "./schema";
import {
  buildFullPrompt,
  buildMatchPrompt,
  DEFAULT_REFERENCE_MODE,
  fullSystemPrompt,
  matchSystemPrompt,
  MAX_RESUME_CHARS,
  truncateLines,
  type ReferenceMode,
} from "./prompt";
import { cleanJobDescription } from "./job-text";
import {
  bracketUnsupportedTerms,
  resolveLineRefs,
  verifyKeywords,
  verifyRequirements,
  verifySuggestions,
} from "./verify";
import { computeScore } from "./scoring";
import { runFormatChecks } from "./format-checks";
import { AI_BUZZWORDS } from "./buzzwords";
import type { AnalysisResult, JobProfile } from "./types";

/** Example templates are meant to sound human: drop any that use AI filler words */
const hasBuzzword = (text: string) => {
  const t = text.toLowerCase();
  return AI_BUZZWORDS.some((w) => t.includes(w));
};

export { PROMPT_VERSION } from "./prompt";
export { cleanJobDescription, jobFingerprintText } from "./job-text";
export type * from "./types";

export interface AnalyzeInput {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  resumeText: string;
  pageCount: number | null;
  /**
   * The saved profile of this job from an earlier analysis. When given, only the
   * resume is judged (a smaller call) against the same requirements, so scores
   * stay comparable across resume versions.
   */
  profile?: JobProfile | null;
  reference?: ReferenceMode;
}

export interface AnalyzeOutput {
  result: AnalysisResult;
  /** The job profile used: the one passed in, or a new one to save */
  profile: JobProfile;
  profileIsNew: boolean;
  model: string;
  usedFallback: boolean;
  usage: AiUsageStats;
}

/**
 * Analyze one resume against one job in a single AI call. The first analysis
 * of a job also produces its profile (requirements, keywords, benchmarks); later
 * analyses reuse it. Every claim is verified against the resume and the score
 * is computed in code.
 */
export async function analyzeResumeMatch(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const allLines = input.resumeText.split("\n").filter(Boolean);
  const lines = truncateLines(allLines, MAX_RESUME_CHARS);
  const mode = input.reference ?? DEFAULT_REFERENCE_MODE;
  const promptInput = {
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    jobDescription: cleanJobDescription(input.jobDescription),
    resumeLines: lines,
  };
  // Unset = model default. GEMINI_THINKING=minimal|low|medium|high
  const thinking = thinkingEffortFromEnv("GEMINI_THINKING");

  let raw: RawAnalysis;
  let call: { model: string; usedFallback: boolean; usage: AiUsageStats };
  if (input.profile) {
    const out = await generateStructured({
      system: matchSystemPrompt(mode),
      prompt: buildMatchPrompt(promptInput, input.profile),
      schema: matchSchema,
      thinking,
    });
    raw = fromMatch(input.profile, out.data);
    call = out;
  } else {
    const out = await generateStructured({
      system: fullSystemPrompt(mode),
      prompt: buildFullPrompt(promptInput),
      schema: fullAnalysisSchema,
      thinking,
    });
    raw = fromFull(out.data);
    call = out;
  }

  const clamped = clampOutput(raw);
  const fix = (t: string) => resolveLineRefs(t, lines);
  const requirements = verifyRequirements(
    clamped.requirements.map((r) => ({ ...r, note: fix(r.note) })),
    lines
  );
  const keywords = verifyKeywords(clamped.keywords, input.resumeText);
  const missingTerms = keywords.filter((k) => !k.inResume).map((k) => k.term);

  return {
    model: call.model,
    usedFallback: call.usedFallback,
    usage: call.usage,
    profile: input.profile ?? profileFrom(clamped),
    profileIsNew: !input.profile,
    result: {
      score: computeScore(requirements),
      summary: fix(clamped.summary),
      requirements,
      keywords,
      suggestions: verifySuggestions(
        clamped.suggestions.map((s) => ({
          ...s,
          title: fix(s.title),
          rationale: fix(s.rationale),
        })),
        lines
      ),
      formatChecks: runFormatChecks(allLines, input.pageCount),
      insights: {
        seniority: clamped.seniority,
        roleSummary: fix(clamped.roleSummary),
        benchmarks: clamped.benchmarks.map((b) => ({
          area: b.area,
          title: b.title,
          typical: fix(b.typical),
          yourStatus: b.yourStatus,
          gap: fix(b.gap),
          examples: b.examples
            .filter((e) => !hasBuzzword(e))
            .map((e) => bracketUnsupportedTerms(e, missingTerms)),
        })),
        actionPlan: clamped.actionPlan.map((step) => ({
          ...step,
          title: fix(step.title),
          detail: fix(step.detail),
        })),
      },
    },
  };
}
