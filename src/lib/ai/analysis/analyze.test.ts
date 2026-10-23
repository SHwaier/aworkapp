import { describe, expect, it, vi } from "vitest";
import type { FullAnalysisOutput, MatchOutput } from "./schema";
import { SAMPLE_JOB, SAMPLE_RESUME } from "./__fixtures__/sample";

const judgment = { evidenceLines: [] as number[], evidenceQuote: "", note: "" };

const fakeFull: FullAnalysisOutput = {
  seniority: "senior",
  roleSummary: "Backend depth plus cloud operations.",
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
    { text: "AWS", category: "skill", importance: "required", coverage: "missing", ...judgment },
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
  benchmarks: [
    {
      area: "skills",
      title: "Cloud platforms",
      typical: "Strong candidates list AWS services they've run in production.",
      yourStatus: "missing",
      gap: "No cloud provider listed.",
      example: "Ran [service] on Kubernetes handling [N] requests/day",
    },
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
  actionPlan: [
    {
      title: "Add cloud experience",
      detail: "d",
      impact: "high",
      effort: "medium",
      relatedRequirement: "AWS",
    },
  ],
  summary: "Strong backend fit; missing cloud experience.",
};

// A re-analysis that now meets AWS (line 12 is the Redis bullet, used as stand-in evidence)
// and skips requirement 4 and the benchmark entirely
const fakeMatch: MatchOutput = {
  requirements: [
    {
      ref: 1,
      coverage: "met",
      evidenceLines: [7],
      evidenceQuote: "Node.js and TypeScript",
      note: "",
    },
    { ref: 2, coverage: "missing", ...judgment },
    { ref: 3, coverage: "met", evidenceLines: [12], evidenceQuote: "Redis caching", note: "" },
  ],
  benchmarks: [],
  suggestions: [],
  actionPlan: [],
  summary: "Better.",
};

const generateStructured = vi.fn(async ({ system }: { system: string; prompt: string }) => ({
  data: system.includes("This job was analyzed before") ? fakeMatch : fakeFull,
  model: "test-model",
  usedFallback: false,
  usage: { inputTokens: 1, outputTokens: 2, thoughtTokens: 1 },
}));

vi.mock("@/lib/ai/client", () => ({
  AI_MODEL: "test-model",
  thinkingEffortFromEnv: () => undefined,
  generateStructured: (args: { system: string; prompt: string }) => generateStructured(args),
}));

const { analyzeResumeMatch } = await import("./index");

const input = {
  jobTitle: "Senior Backend Engineer",
  companyName: "Example Co",
  jobDescription: `${SAMPLE_JOB}\n\nWe are an equal opportunity employer.`,
  resumeText: SAMPLE_RESUME,
  pageCount: 1,
};

describe("analyzeResumeMatch (fake AI)", () => {
  it("verifies every claim and computes the score from verified coverage", async () => {
    const { result, model } = await analyzeResumeMatch(input);
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

  it("makes one call for a new job and returns its profile to save", async () => {
    generateStructured.mockClear();
    const { profile, profileIsNew, result, usage } = await analyzeResumeMatch(input);
    expect(generateStructured).toHaveBeenCalledTimes(1);
    expect(profileIsNew).toBe(true);
    expect(profile.requirements.map((r) => r.text)).toEqual([
      "TypeScript and Node.js",
      "Kubernetes in production",
      "AWS",
      "Mentoring",
    ]);
    expect(profile.benchmarks[0]).toEqual({
      area: "skills",
      title: "Cloud platforms",
      typical: "Strong candidates list AWS services they've run in production.",
    });
    expect(usage).toEqual({ inputTokens: 1, outputTokens: 2, thoughtTokens: 1 });
    // A missing job keyword in an example is bracketed so it can't be copied as a claim
    expect(result.insights?.benchmarks[0].examples).toEqual([
      "Ran [service] on [Kubernetes] handling [N] requests/day",
    ]);
  });

  it("drops example templates that use AI buzzwords", async () => {
    const original = fakeFull.benchmarks[0].example;
    fakeFull.benchmarks[0].example = "Orchestrated [N] deployments";
    const { result } = await analyzeResumeMatch(input);
    fakeFull.benchmarks[0].example = original;
    expect(result.insights?.benchmarks[0].examples).toEqual([]);
  });

  it("sends the cleaned job description, without boilerplate", async () => {
    generateStructured.mockClear();
    await analyzeResumeMatch(input);
    const prompt = generateStructured.mock.calls[0][0].prompt;
    expect(prompt).toContain("Kubernetes in production");
    expect(prompt).not.toMatch(/equal opportunity/i);
  });

  it("re-analyzes against a saved profile with the same requirements", async () => {
    const first = await analyzeResumeMatch(input);
    generateStructured.mockClear();
    const second = await analyzeResumeMatch({ ...input, profile: first.profile });

    expect(generateStructured).toHaveBeenCalledTimes(1);
    expect(generateStructured.mock.calls[0][0].prompt).not.toContain("<job_description>");
    expect(second.profileIsNew).toBe(false);
    expect(second.profile).toBe(first.profile);
    expect(second.result.requirements.map((r) => r.text)).toEqual(
      first.result.requirements.map((r) => r.text)
    );
    const aws = second.result.requirements.find((r) => r.text === "AWS")!;
    expect(aws.coverage).toBe("met");
    // Requirement 4 was skipped by the model: not shown, so missing (never guessed as met)
    expect(second.result.requirements[3]).toMatchObject({ text: "Mentoring", coverage: "missing" });
    // Keywords come from the profile and are checked against the resume in code
    expect(second.result.keywords.map((k) => k.term)).toEqual(["Kubernetes", "PostgreSQL"]);
    expect(second.result.insights?.benchmarks[0]).toMatchObject({
      title: "Cloud platforms",
      yourStatus: "weak",
    });
  });
});
