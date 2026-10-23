import { describe, it } from "vitest";
import { writeFileSync } from "fs";
import type { AiUsageStats } from "@/lib/ai/client";
import { analyzeResumeMatch } from "./index";
import type { ReferenceMode } from "./prompt";
import { AI_BUZZWORDS } from "./buzzwords";
import { containsTerm } from "./verify";
import { EVAL_CASES, type EvalCase } from "./__fixtures__/eval-cases";
import type { AnalysisResult } from "./types";

/**
 * Accuracy and cost evaluation on live Gemini (uses real quota). Run with:
 *   npm run eval:ai
 * Each case is analyzed for resume v1, then v2 (an improved version), the way
 * a user re-analyzes after uploading a new version. Ground truth in
 * __fixtures__/eval-cases.ts checks that clear skills are met, absent skills
 * are missing, and skills added in v2 move up.
 * LIVE_OUT=path.json saves every result. Results: docs/experiments/ai-efficiency.md
 */

interface Run {
  result: AnalysisResult;
  usage: AiUsageStats;
  calls: number;
  model: string;
  seconds: number;
}

interface Variant {
  name: string;
  run(c: EvalCase): Promise<{ v1: Run; v2: Run }>;
}

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t = Date.now();
  const out = await fn();
  return [out, (Date.now() - t) / 1000];
}

/** One call per analysis; v2 is judged against the job profile saved from v1 */
function v6(name: string, reference: ReferenceMode): Variant {
  return {
    name,
    async run(c) {
      const input = {
        jobTitle: c.jobTitle,
        companyName: c.companyName,
        jobDescription: c.jobDescription,
        pageCount: 1,
        reference,
      };
      const [first, s1] = await timed(() =>
        analyzeResumeMatch({ ...input, resumeText: c.resumeV1 })
      );
      const [second, s2] = await timed(() =>
        analyzeResumeMatch({ ...input, resumeText: c.resumeV2, profile: first.profile })
      );
      const run = (o: typeof first, seconds: number): Run => ({
        result: o.result,
        usage: o.usage,
        calls: 1,
        model: o.usedFallback ? `${o.model} (fallback)` : o.model,
        seconds,
      });
      return { v1: run(first, s1), v2: run(second, s2) };
    },
  };
}

// The v5 baseline (two calls per analysis, requirements re-read every time) was
// measured before this pipeline replaced it; its numbers are in the doc above.
const VARIANTS: Variant[] = [v6("v6-condensed", "condensed"), v6("v6-full", "full")];

const coverageOf = (r: AnalysisResult, term: string) =>
  r.requirements.find((req) => term.split("|").some((t) => containsTerm(req.text, t)))?.coverage ??
  "not extracted";

const label = (term: string) => term.split("|")[0];
// Free tiers limit tokens per minute; a pause between cases keeps runs under it
const PAUSE_MS = Number(process.env.EVAL_PAUSE_MS ?? 30_000);

/** Ground-truth checks for one case; each check passes or fails */
function truthChecks(c: EvalCase, v1: AnalysisResult, v2: AnalysisResult) {
  const checks: { check: string; pass: boolean; got: string }[] = [];
  for (const t of c.truth.met) {
    const got = coverageOf(v1, t);
    checks.push({ check: `${label(t)} met`, pass: got === "met", got });
  }
  for (const t of c.truth.missing) {
    for (const [which, r] of [
      ["v1", v1],
      ["v2", v2],
    ] as const) {
      const got = coverageOf(r, t);
      // Not extracted is fine for an absent skill: it can't be wrongly credited
      checks.push({
        check: `${label(t)} missing (${which})`,
        pass: got === "missing" || got === "not extracted",
        got,
      });
    }
  }
  const rank = { missing: 0, partial: 1, met: 2, "not extracted": -1 } as const;
  for (const t of c.truth.addedInV2) {
    const a = coverageOf(v1, t);
    const b = coverageOf(v2, t);
    checks.push({
      check: `${label(t)} improves in v2`,
      pass: a !== "not extracted" && b !== "not extracted" && rank[b] > rank[a],
      got: `${a} -> ${b}`,
    });
  }
  return checks;
}

const words = (r: AnalysisResult) =>
  [
    ...r.suggestions.map((s) => s.suggestedText),
    ...(r.insights?.benchmarks.flatMap((b) => b.examples) ?? []),
  ].join(" ");

function runMetrics(c: EvalCase, run: Run) {
  const r = run.result;
  const examples = r.insights?.benchmarks.flatMap((b) => b.examples).join(" ") ?? "";
  return {
    calls: run.calls,
    inputTokens: run.usage.inputTokens,
    outputTokens: run.usage.outputTokens,
    seconds: run.seconds,
    score: r.score,
    requirements: r.requirements.length,
    unverifiedClaims: r.requirements.filter((q) => q.claimedCoverage !== q.coverage).length,
    suggestions: r.suggestions.length,
    buzzwords: AI_BUZZWORDS.filter((w) => words(r).toLowerCase().includes(w)).length,
    // Absent skills written into examples as if true (should be bracketed)
    unbracketedMissing: c.truth.missing.filter((m) =>
      examples.split(/\[[^\]]*\]/).some((seg) => m.split("|").some((t) => containsTerm(seg, t)))
    ).length,
    benchmarks: r.insights?.benchmarks.length ?? 0,
    actionSteps: r.insights?.actionPlan.length ?? 0,
  };
}

const selected = (process.env.EVAL_VARIANTS ?? VARIANTS.map((v) => v.name).join(","))
  .split(",")
  .map((s) => s.trim());

/** EVAL_RESCORE=path.json: re-check saved results against the current ground truth (no AI calls) */
describe.runIf(!!process.env.EVAL_RESCORE)("AI evaluation (re-score saved results)", () => {
  it("re-scores", async () => {
    const { readFileSync } = await import("fs");
    const saved = JSON.parse(readFileSync(process.env.EVAL_RESCORE!, "utf8")) as {
      variant: string;
      case: string;
      v1?: Run;
      v2?: Run;
    }[];
    const rows = saved
      .filter((r) => r.v1 && r.v2)
      .map((r) => {
        const c = EVAL_CASES.find((x) => x.id === r.case)!;
        const checks = truthChecks(c, r.v1!.result, r.v2!.result);
        return {
          variant: r.variant,
          case: r.case,
          truth: `${checks.filter((x) => x.pass).length}/${checks.length}`,
          failed: checks
            .filter((x) => !x.pass)
            .map((x) => `${x.check}: ${x.got}`)
            .join("; "),
        };
      });
    console.log(JSON.stringify(rows, null, 1));
    if (process.env.LIVE_OUT) {
      const { writeFileSync } = await import("fs");
      writeFileSync(process.env.LIVE_OUT, JSON.stringify(rows, null, 1));
    }
  });
});

describe.skipIf(!process.env.GEMINI_API_KEY || !!process.env.EVAL_RESCORE)(
  "AI evaluation (live)",
  () => {
    it("compares variants", { timeout: 3_600_000 }, async () => {
      const rows: Record<string, unknown>[] = [];
      const saved: Record<string, unknown>[] = [];
      const save = () =>
        process.env.LIVE_OUT && writeFileSync(process.env.LIVE_OUT, JSON.stringify(saved, null, 2));

      for (const variant of VARIANTS.filter((v) => selected.includes(v.name))) {
        for (const c of EVAL_CASES) {
          try {
            const { v1, v2 } = await variant.run(c);
            const checks = truthChecks(c, v1.result, v2.result);
            const sameRequirements =
              JSON.stringify(v1.result.requirements.map((q) => q.text)) ===
              JSON.stringify(v2.result.requirements.map((q) => q.text));
            const m1 = runMetrics(c, v1);
            const m2 = runMetrics(c, v2);
            rows.push({
              variant: variant.name,
              case: c.id,
              model: v1.model,
              calls: m1.calls + m2.calls,
              inTok: m1.inputTokens + m2.inputTokens,
              outTok: m1.outputTokens + m2.outputTokens,
              secs: Math.round(m1.seconds + m2.seconds),
              score: `${m1.score} -> ${m2.score}`,
              truth: `${checks.filter((x) => x.pass).length}/${checks.length}`,
              sameReqs: sameRequirements,
              unverified: m1.unverifiedClaims + m2.unverifiedClaims,
              buzz: m1.buzzwords + m2.buzzwords,
              unbracketed: m1.unbracketedMissing + m2.unbracketedMissing,
            });
            saved.push({ variant: variant.name, case: c.id, checks, m1, m2, v1, v2 });
          } catch (e) {
            rows.push({ variant: variant.name, case: c.id, error: (e as Error).message });
            saved.push({ variant: variant.name, case: c.id, error: (e as Error).message });
          }
          save();
          console.log(JSON.stringify(rows[rows.length - 1]));
          await new Promise((r) => setTimeout(r, PAUSE_MS));
        }
      }
      console.table(rows);
    });
  }
);
