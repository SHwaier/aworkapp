import { describe, expect, it } from "vitest";
import {
  bracketUnsupportedTerms,
  resolveLineRefs,
  computeScore,
  containsTerm,
  normalizeForMatch,
  verifyKeywords,
  verifyRequirements,
  verifySuggestions,
} from "./verify";
import { clampOutput, type AiAnalysisOutput } from "./schema";
import { potentialScore, scoreOpportunities } from "./scoring";

const LINES = [
  "Jordan Rivera",
  "Built a Node.js and TypeScript ingestion service processing 2M events per day.",
  "Developed REST APIs in Python (Django) backed by PostgreSQL.",
  "Skills: C++, C#, .NET, CI/CD, Kubernetes-adjacent tooling",
];

type Req = AiAnalysisOutput["requirements"][number];
const req = (overrides: Partial<Req>): Req => ({
  text: "Requirement",
  category: "skill",
  importance: "required",
  coverage: "met",
  evidenceLines: [],
  evidenceQuote: "",
  note: "",
  ...overrides,
});

describe("normalizeForMatch", () => {
  it("ignores case, curly quotes, dashes and whitespace runs", () => {
    expect(normalizeForMatch("  Led  “Big”—Project ")).toBe('led "big"-project');
  });
});

describe("containsTerm", () => {
  it.each([
    ["Node.js", true],
    ["typescript", true],
    ["C++", true],
    ["C#", true],
    [".NET", true],
    ["CI/CD", true],
    ["Postgres", false], // partial word must not match PostgreSQL
    ["Java", false],
    ["REST API", false],
  ])("%s -> %s", (term, expected) => {
    expect(containsTerm(LINES.join("\n"), term)).toBe(expected);
  });

  it("treats spaces and hyphens as interchangeable", () => {
    expect(containsTerm("Kubernetes-adjacent tooling", "kubernetes adjacent")).toBe(true);
  });
});

describe("verifyRequirements", () => {
  it("accepts met when the quote appears in the cited line and returns the resume's own text", () => {
    const [r] = verifyRequirements(
      [req({ evidenceLines: [2], evidenceQuote: "node.js and typescript" })],
      LINES
    );
    expect(r.coverage).toBe("met");
    expect(r.evidenceVerified).toBe(true);
    expect(r.evidence).toBe(LINES[1]);
  });

  it("downgrades met to partial when the quote is made up", () => {
    const [r] = verifyRequirements(
      [req({ evidenceLines: [2], evidenceQuote: "deployed on Kubernetes in production" })],
      LINES
    );
    expect(r.coverage).toBe("partial");
    expect(r.claimedCoverage).toBe("met");
    expect(r.evidenceVerified).toBe(false);
    expect(r.evidence).toBe("");
  });

  it("downgrades partial to missing when cited lines don't exist", () => {
    const [r] = verifyRequirements([req({ coverage: "partial", evidenceLines: [99] })], LINES);
    expect(r.coverage).toBe("missing");
  });

  it("accepts a quote found elsewhere in the resume even if the line number is wrong", () => {
    const [r] = verifyRequirements(
      [req({ evidenceLines: [1], evidenceQuote: "backed by PostgreSQL" })],
      LINES
    );
    expect(r.coverage).toBe("met");
    expect(r.evidenceVerified).toBe(true);
  });

  it("leaves missing requirements alone", () => {
    const [r] = verifyRequirements([req({ coverage: "missing" })], LINES);
    expect(r).toMatchObject({ coverage: "missing", claimedCoverage: "missing", evidence: "" });
  });
});

describe("verifyKeywords", () => {
  it("drops generic words that aren't real keywords", () => {
    const out = verifyKeywords(
      [
        { term: "Production", importance: "required" },
        { term: "Kubernetes", importance: "required" },
      ],
      ""
    );
    expect(out.map((k) => k.term)).toEqual(["Kubernetes"]);
  });

  it("computes inResume itself and drops duplicates", () => {
    const out = verifyKeywords(
      [
        { term: "TypeScript", importance: "required" },
        { term: "typescript ", importance: "preferred" },
        { term: "AWS", importance: "required" },
      ],
      LINES.join("\n")
    );
    expect(out).toEqual([
      { term: "TypeScript", importance: "required", inResume: true },
      { term: "AWS", importance: "required", inResume: false },
    ]);
  });
});

describe("verifySuggestions", () => {
  type Sug = AiAnalysisOutput["suggestions"][number];
  const sug = (o: Partial<Sug>): Sug => ({
    type: "rewrite_bullet",
    priority: "high",
    title: "t",
    line: 2,
    suggestedText: "Designed a Node.js service handling 2M events/day with 99.9% uptime.",
    rationale: "",
    requiresVerification: true,
    ...o,
  });

  it("fills the original from the resume line, not the model", () => {
    const [s] = verifySuggestions([sug({})], LINES);
    expect(s.original).toBe(LINES[1]);
  });

  it("drops rewrites pointing at missing lines or changing nothing", () => {
    expect(verifySuggestions([sug({ line: 0 }), sug({ line: 42 })], LINES)).toHaveLength(0);
    expect(
      verifySuggestions([sug({ suggestedText: `  ${LINES[1].toUpperCase()} ` })], LINES)
    ).toHaveLength(0);
  });

  it("keeps non-rewrite suggestions without an original", () => {
    const [s] = verifySuggestions(
      [sug({ type: "add_keyword", line: 0, suggestedText: "Add AWS" })],
      LINES
    );
    expect(s).toMatchObject({ type: "add_keyword", original: "", suggestedText: "Add AWS" });
  });
});

describe("computeScore", () => {
  it("weights required double and partial as half", () => {
    // required met (2) + required missing (0) + preferred partial (0.5) = 2.5 / 5
    expect(
      computeScore([
        { importance: "required", coverage: "met" },
        { importance: "required", coverage: "missing" },
        { importance: "preferred", coverage: "partial" },
      ])
    ).toBe(50);
  });

  it("is 100 when everything is met and 0 with no requirements", () => {
    expect(computeScore([{ importance: "preferred", coverage: "met" }])).toBe(100);
    expect(computeScore([])).toBe(0);
  });
});

describe("clampOutput", () => {
  it("trims oversized model output instead of rejecting it", () => {
    const out = clampOutput({
      summary: "x".repeat(2000),
      requirements: Array.from({ length: 40 }, () => req({ evidenceLines: [1, 2, 3, 4, 5, 6, 7] })),
      keywords: [],
      suggestions: [],
    });
    expect(out.summary.length).toBe(600);
    expect(out.requirements).toHaveLength(25);
    expect(out.requirements[0].evidenceLines).toHaveLength(5);
  });
});

describe("scoreOpportunities", () => {
  it("ranks unmet requirements by how many points meeting them would add", () => {
    const reqs = [
      { text: "A", importance: "required" as const, coverage: "met" as const },
      { text: "B", importance: "required" as const, coverage: "missing" as const },
      { text: "C", importance: "preferred" as const, coverage: "partial" as const },
    ];
    // score now: (2 + 0 + 0.5) / 5 = 50; B met -> 4.5/5 = 90 (+40); C met -> 3/5 = 60 (+10)
    expect(scoreOpportunities(reqs)).toEqual([
      { requirement: "B", importance: "required", coverage: "missing", gain: 40 },
      { requirement: "C", importance: "preferred", coverage: "partial", gain: 10 },
    ]);
  });

  it("is empty when everything is met", () => {
    expect(scoreOpportunities([{ text: "A", importance: "required", coverage: "met" }])).toEqual(
      []
    );
  });
});

describe("bracketUnsupportedTerms", () => {
  const missing = ["AWS", "AWS Lambda", "Kubernetes", "C++"];

  it("brackets unsupported terms, preferring the longest match", () => {
    expect(bracketUnsupportedTerms("Deployed on AWS Lambda with Kubernetes", missing)).toBe(
      "Deployed on [AWS Lambda] with [Kubernetes]"
    );
  });

  it("leaves already-bracketed text and supported terms alone", () => {
    expect(bracketUnsupportedTerms("Node.js on [AWS Lambda] and AWS", missing)).toBe(
      "Node.js on [AWS Lambda] and [AWS]"
    );
  });

  it("doesn't touch partial words", () => {
    expect(bracketUnsupportedTerms("Used flaws analysis", ["AWS"])).toBe("Used flaws analysis");
    expect(bracketUnsupportedTerms("Wrote C++ code", missing)).toBe("Wrote [C++] code");
  });
});

describe("resolveLineRefs", () => {
  it("replaces parenthesized line references with short quotes", () => {
    expect(resolveLineRefs("Some bullets (e.g., L2, L3) lack metrics.", LINES)).toBe(
      "Some bullets (“Built a Node.js and TypeScript ingestion…”, “Developed REST APIs in Python (Django)…”) lack metrics."
    );
  });

  it("replaces 'bullet L2' style references", () => {
    expect(resolveLineRefs("Rewrite bullet L2 to add impact.", LINES)).toBe(
      "Rewrite bullet “Built a Node.js and TypeScript ingestion…” to add impact."
    );
  });

  it("leaves real text and unknown lines untouched", () => {
    expect(resolveLineRefs("Tuned L2 cache as an L5 engineer.", LINES)).toBe(
      "Tuned L2 cache as an L5 engineer."
    );
    expect(resolveLineRefs("See (L99) here.", LINES)).toBe("See (L99) here.");
  });
});

describe("potentialScore", () => {
  const reqs = [
    { text: "A", importance: "required" as const, coverage: "met" as const },
    { text: "B", importance: "required" as const, coverage: "missing" as const },
    { text: "C", importance: "preferred" as const, coverage: "partial" as const },
  ];
  it("adds up the biggest opportunities", () => {
    expect(potentialScore(reqs, 0)).toBe(50);
    expect(potentialScore(reqs, 1)).toBe(90);
    expect(potentialScore(reqs, 3)).toBe(100);
  });
});
