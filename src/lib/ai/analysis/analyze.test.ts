import { describe, expect, it, vi } from "vitest";
import type { AiAnalysisOutput } from "./schema";
import { SAMPLE_JOB, SAMPLE_RESUME } from "./__fixtures__/sample";

const fakeOutput: AiAnalysisOutput = {
  summary: "Strong backend fit; missing cloud experience.",
  requirements: [
    // Line 7 is the Node.js/TypeScript bullet in SAMPLE_RESUME; line 9 is the mentoring bullet
    {
      text: "TypeScript and Node.js",
      category: "skill",
      importance: "required",
      coverage: "met",
      evidenceLines: [7],
      evidenceQuote: "Node.js and TypeScript",
      note: "",
    },
    // Fabricated evidence: must be downgraded
    {
      text: "Kubernetes in production",
      category: "skill",
      importance: "required",
      coverage: "met",
      evidenceLines: [7],
      evidenceQuote: "ran Kubernetes clusters",
      note: "",
    },
    {
      text: "AWS",
      category: "skill",
      importance: "required",
      coverage: "missing",
      evidenceLines: [],
      evidenceQuote: "",
      note: "",
    },
    {
      text: "Mentoring",
      category: "experience",
      importance: "preferred",
      coverage: "met",
      evidenceLines: [9],
      evidenceQuote: "Mentored three junior engineers",
      note: "",
    },
  ],
  keywords: [
    { term: "Kubernetes", importance: "required" },
    { term: "PostgreSQL", importance: "required" },
  ],
  suggestions: [
    {
      type: "rewrite_bullet",
      priority: "high",
      title: "Quantify",
      line: 7,
      suggestedText: "Designed a Node.js/TypeScript service for 2M events/day.",
      rationale: "",
      requiresVerification: false,
    },
    {
      type: "rewrite_bullet",
      priority: "low",
      title: "Bad line",
      line: 500,
      suggestedText: "x",
      rationale: "",
      requiresVerification: false,
    },
  ],
};

const fakeInsights = {
  seniority: "senior",
  roleSummary: "Backend depth plus cloud operations.",
  benchmarks: [
    {
      area: "skills",
      title: "Cloud platforms",
      typical: "Strong candidates list AWS services they've run in production.",
      yourStatus: "missing",
      gap: "No cloud provider listed.",
      examples: ["Ran [service] on AWS Lambda handling [N] requests/day", "a", "too many"],
    },
  ],
  actionPlan: [
    {
      title: "Add cloud experience",
      detail: "d",
      impact: "high",
      effort: "medium",
      relatedRequirement: "AWS",
    },
  ],
};

let insightsFail = false;
vi.mock("@/lib/ai/client", () => {
  class AiError extends Error {}
  return {
    AiError,
    AI_MODEL: "test-model",
    generateStructured: vi.fn(async ({ system }: { system: string }) => {
      const isInsights = system.includes("experienced hiring manager and resume coach");
      if (isInsights && insightsFail) throw new AiError("Role insights service down");
      return {
        data: isInsights ? fakeInsights : fakeOutput,
        model: "test-model",
        usage: { inputTokens: 1, outputTokens: 2 },
      };
    }),
  };
});

const { analyzeResumeMatch } = await import("./index");

describe("analyzeResumeMatch (fake AI)", () => {
  it("verifies every claim and computes the score from verified coverage", async () => {
    const { result, model } = await analyzeResumeMatch({
      jobTitle: "Senior Backend Engineer",
      companyName: "Example Co",
      jobDescription: SAMPLE_JOB,
      resumeText: SAMPLE_RESUME,
      pageCount: 1,
    });

    expect(model).toBe("test-model");

    const k8s = result.requirements.find((r) => r.text.startsWith("Kubernetes"))!;
    expect(k8s).toMatchObject({
      claimedCoverage: "met",
      coverage: "partial",
      evidenceVerified: false,
    });

    // required: met(2) + partial(1) + missing(0); preferred: met(1) => 4 / 7
    expect(result.score).toBe(Math.round((4 / 7) * 100));

    expect(result.keywords).toEqual([
      { term: "Kubernetes", importance: "required", inResume: false },
      { term: "PostgreSQL", importance: "required", inResume: true },
    ]);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].original).toBe(
      "Built a Node.js and TypeScript ingestion service processing 2M events per day."
    );
    expect(result.formatChecks.length).toBeGreaterThan(0);
  });

  it("includes role insights, trimmed to limits, and sums token usage", async () => {
    const { result, usage, insightsError } = await analyzeResumeMatch({
      jobTitle: "Senior Backend Engineer",
      companyName: "Example Co",
      jobDescription: SAMPLE_JOB,
      resumeText: SAMPLE_RESUME,
      pageCount: 1,
    });
    expect(insightsError).toBeNull();
    expect(usage).toEqual({ inputTokens: 2, outputTokens: 4 });
    expect(result.insights?.benchmarks[0].examples).toHaveLength(2);
    expect(result.insights?.actionPlan[0]).toMatchObject({ impact: "high", effort: "medium" });
    expect(result.requirements[0].category).toBe("skill");
  });

  it("still completes the core analysis when insights fail", async () => {
    insightsFail = true;
    const { result, insightsError } = await analyzeResumeMatch({
      jobTitle: "Senior Backend Engineer",
      companyName: "Example Co",
      jobDescription: SAMPLE_JOB,
      resumeText: SAMPLE_RESUME,
      pageCount: 1,
    });
    insightsFail = false;
    expect(result.insights).toBeNull();
    expect(insightsError).toBe("Role insights service down");
    expect(result.score).toBeGreaterThan(0);
  });
});
