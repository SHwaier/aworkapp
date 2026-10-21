import { describe, expect, it } from "vitest";
import { analyzeResumeMatch } from "./index";
import { generateInsights, INSIGHTS_MODEL } from "./insights";
import { AI_BUZZWORDS } from "./buzzwords";
import { SAMPLE_JOB, SAMPLE_RESUME } from "./__fixtures__/sample";

/**
 * Calls the real Gemini API (needs GEMINI_API_KEY). Run with:
 *   npm run test:live
 */
describe.skipIf(!process.env.GEMINI_API_KEY)("analyzeResumeMatch (live)", () => {
  it("returns a verified analysis for a sample resume", { timeout: 120_000 }, async () => {
    const { result, model, usage, insightsError } = await analyzeResumeMatch({
      jobTitle: "Senior Backend Engineer",
      companyName: "Example Co",
      jobDescription: SAMPLE_JOB,
      resumeText: SAMPLE_RESUME,
      pageCount: 1,
    });

    if (process.env.LIVE_OUT) {
      const { writeFileSync } = await import("fs");
      writeFileSync(process.env.LIVE_OUT, JSON.stringify({ model, usage, ...result }, null, 2));
    }

    expect(result.requirements.length).toBeGreaterThan(0);
    expect(insightsError).toBeNull();
    expect(result.insights?.benchmarks.length).toBeGreaterThan(0);
    expect(result.insights?.actionPlan.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    // Kubernetes is nowhere in the resume, so it must not be counted as met
    const k8s = result.requirements.find((r) => /kubernetes/i.test(r.text));
    if (k8s) expect(k8s.coverage).toBe("missing");
    // Every rewrite's original must be a real resume line
    for (const s of result.suggestions.filter((s) => s.type === "rewrite_bullet")) {
      expect(SAMPLE_RESUME.split("\n")).toContain(s.original);
    }
  });

  it("generates role insights on the insights model", { timeout: 120_000 }, async () => {
    const { data, model, usage } = await generateInsights({
      jobTitle: "Senior Backend Engineer",
      companyName: "Example Co",
      jobDescription: SAMPLE_JOB,
      resumeLines: SAMPLE_RESUME.split("\n"),
    });

    if (process.env.LIVE_OUT) {
      const { writeFileSync } = await import("fs");
      writeFileSync(
        `${process.env.LIVE_OUT}.insights.json`,
        JSON.stringify({ model, usage, ...data }, null, 2)
      );
    }

    expect(model).toBe(INSIGHTS_MODEL);
    expect(data.benchmarks.length).toBeGreaterThan(0);
    expect(data.actionPlan.length).toBeGreaterThan(0);
    // Examples follow the reference: no AI buzzwords
    const examples = data.benchmarks
      .flatMap((b) => b.examples)
      .join(" ")
      .toLowerCase();
    for (const word of AI_BUZZWORDS) expect(examples).not.toContain(word);
  });
});
