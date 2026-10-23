import { describe, expect, it } from "vitest";
import { analyzeResumeMatch } from "./index";
import { AI_BUZZWORDS } from "./buzzwords";
import { SAMPLE_JOB, SAMPLE_RESUME } from "./__fixtures__/sample";

/**
 * Calls the real Gemini API (needs GEMINI_API_KEY; 2 calls). Run with:
 *   npm run test:live
 */
describe.skipIf(!process.env.GEMINI_API_KEY)("analyzeResumeMatch (live)", () => {
  it(
    "analyzes a new job, then re-analyzes against its saved profile",
    { timeout: 240_000 },
    async () => {
      const input = {
        jobTitle: "Senior Backend Engineer",
        companyName: "Example Co",
        jobDescription: SAMPLE_JOB,
        resumeText: SAMPLE_RESUME,
        pageCount: 1,
      };
      const first = await analyzeResumeMatch(input);
      const second = await analyzeResumeMatch({ ...input, profile: first.profile });

      if (process.env.LIVE_OUT) {
        const { writeFileSync } = await import("fs");
        writeFileSync(process.env.LIVE_OUT, JSON.stringify({ first, second }, null, 2));
      }

      for (const { result } of [first, second]) {
        expect(result.requirements.length).toBeGreaterThan(0);
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
        // Examples follow the rules: no AI buzzwords
        const examples = (result.insights?.benchmarks ?? [])
          .flatMap((b) => b.examples)
          .join(" ")
          .toLowerCase();
        for (const word of AI_BUZZWORDS) expect(examples).not.toContain(word);
      }
      // Same resume, same profile: same requirement list
      expect(second.result.requirements.map((r) => r.text)).toEqual(
        first.result.requirements.map((r) => r.text)
      );
    }
  );
});
