import { describe, it } from "vitest";
import { writeFileSync } from "fs";
import { generateStructured, THINKING_EFFORTS, type ThinkingEffort } from "@/lib/ai/client";
import { aiAnalysisSchema, clampOutput } from "./schema";
import { buildUserPrompt, MAX_RESUME_CHARS, SYSTEM_PROMPT, truncateLines } from "./prompt";
import { containsTerm, verifyRequirements, verifySuggestions } from "./verify";
import { computeScore } from "./scoring";
import { generateInsights } from "./insights";
import { AI_BUZZWORDS } from "./buzzwords";
import { SAMPLE_JOB, SAMPLE_RESUME } from "./__fixtures__/sample";

/**
 * Compares thinking effort settings on live Gemini (uses real quota: 2 calls
 * per setting per model). Run with:
 *   THINKING_SETTINGS=default,medium,high npm run test:thinking
 * Results print as a table and, with LIVE_OUT=path.json, are saved in full.
 * See docs/experiments/gemini-thinking-effort.md for past results.
 */
const settings = (process.env.THINKING_SETTINGS ?? "default,medium,high")
  .split(",")
  .map((s) => s.trim())
  .map((s) =>
    s === "default" ? undefined : (THINKING_EFFORTS.find((e) => e === s) as ThinkingEffort)
  );
const RUNS = 2;
const MISSING_TERMS = ["AWS", "Lambda", "SQS", "DynamoDB", "Kubernetes", "Kafka"];

const lines = truncateLines(SAMPLE_RESUME.split("\n"), MAX_RESUME_CHARS);
const input = {
  jobTitle: "Senior Backend Engineer",
  companyName: "Example Co",
  jobDescription: SAMPLE_JOB,
  resumeLines: lines,
};
const buzzwords = (t: string) => AI_BUZZWORDS.filter((w) => t.toLowerCase().includes(w)).length;
const placeholders = (t: string) => (t.match(/\[[^\]]+\]/g) ?? []).length;

describe.skipIf(!process.env.GEMINI_API_KEY)("thinking effort comparison (live)", () => {
  it("compares settings", { timeout: 1_800_000 }, async () => {
    const results: Record<string, unknown>[] = [];
    const save = () =>
      process.env.LIVE_OUT && writeFileSync(process.env.LIVE_OUT, JSON.stringify(results, null, 2));

    for (const effort of settings) {
      for (let run = 1; run <= RUNS; run++) {
        let t = Date.now();
        try {
          const core = await generateStructured({
            system: SYSTEM_PROMPT,
            prompt: buildUserPrompt(input),
            schema: aiAnalysisSchema,
            thinking: effort,
          });
          const data = clampOutput(core.data);
          const reqs = verifyRequirements(data.requirements, lines);
          const sugs = verifySuggestions(data.suggestions, lines);
          const text = sugs.map((s) => s.suggestedText).join(" ");
          results.push({
            call: "core",
            model: core.model,
            effort: effort ?? "default",
            run,
            seconds: (Date.now() - t) / 1000,
            ...core.usage,
            score: computeScore(reqs),
            requirements: reqs.length,
            downgraded: reqs.filter((r) => r.claimedCoverage !== r.coverage).length,
            suggestions: sugs.length,
            dropped: data.suggestions.length - sugs.length,
            placeholders: placeholders(text),
            buzzwords: buzzwords(text),
            raw: data,
          });
        } catch (e) {
          results.push({
            call: "core",
            effort: effort ?? "default",
            run,
            seconds: (Date.now() - t) / 1000,
            error: (e as Error).message,
          });
        }
        save();

        t = Date.now();
        if (effort) process.env.GEMINI_INSIGHTS_THINKING = effort;
        else delete process.env.GEMINI_INSIGHTS_THINKING;
        try {
          const ins = await generateInsights(input);
          const examples = ins.data.benchmarks.flatMap((b) => b.examples).join(" ");
          results.push({
            call: "insights",
            model: ins.model,
            effort: effort ?? "default",
            run,
            seconds: (Date.now() - t) / 1000,
            ...ins.usage,
            benchmarks: ins.data.benchmarks.length,
            actions: ins.data.actionPlan.length,
            placeholders: placeholders(examples),
            unbracketedMissingTerms: MISSING_TERMS.filter((m) =>
              examples.split(/\[[^\]]*\]/).some((segment) => containsTerm(segment, m))
            ).length,
            buzzwords: buzzwords(examples),
            raw: ins.data,
          });
        } catch (e) {
          results.push({
            call: "insights",
            effort: effort ?? "default",
            run,
            seconds: (Date.now() - t) / 1000,
            error: (e as Error).message,
          });
        }
        save();
      }
    }

    console.table(results.map(({ raw: _raw, ...row }) => row));
  });
});
