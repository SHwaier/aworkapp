import { describe, expect, it } from "vitest";
import { reportFileName, reportToMarkdown, type ReportForExport } from "./report-markdown";

const report: ReportForExport = {
  score: 54,
  summary: "Strong backend fit; missing cloud experience.",
  resumeVersionName: "Northwind Cloud Resume - v1",
  completedAt: "2026-10-21T01:00:00.000Z",
  createdAt: "2026-10-21T01:00:00.000Z",
  requirements: [
    {
      text: "TypeScript | Node.js",
      category: "skill",
      importance: "required",
      coverage: "met",
      claimedCoverage: "met",
      evidence: "Built a Node.js service",
      evidenceVerified: true,
      note: "",
    },
    {
      text: "Kubernetes",
      category: "skill",
      importance: "required",
      coverage: "missing",
      claimedCoverage: "missing",
      evidence: "",
      evidenceVerified: false,
      note: "",
    },
  ],
  keywords: [
    { term: "Kubernetes", importance: "required", inResume: false },
    { term: "TypeScript", importance: "required", inResume: true },
  ],
  suggestions: [
    {
      type: "rewrite_bullet",
      priority: "high",
      title: "Quantify the ingestion work",
      original: "Built a Node.js service",
      suggestedText: "Built a Node.js service processing [N] events/day",
      rationale: "Shows scale.",
      requiresVerification: false,
      status: "open",
    },
    {
      type: "add_content",
      priority: "low",
      title: "Add Kubernetes",
      original: "",
      suggestedText: "Deployed [service] on Kubernetes",
      rationale: "",
      requiresVerification: true,
      status: "open",
    },
    {
      type: "wording",
      priority: "medium",
      title: "Already handled",
      original: "",
      suggestedText: "x",
      rationale: "",
      requiresVerification: false,
      status: "done",
    },
  ],
  formatChecks: [
    { id: "email", label: "Email address", status: "pass", detail: "Found." },
    {
      id: "pronouns",
      label: "First-person pronouns",
      status: "warn",
      detail: "2 lines use I or my.",
    },
  ],
  insights: {
    seniority: "senior",
    roleSummary: "Backend depth plus cloud operations.",
    benchmarks: [
      {
        area: "projects",
        title: "Projects",
        typical: "2-3 relevant projects.",
        yourStatus: "missing",
        gap: "No projects section.",
        examples: ["Built [project] using [tool]"],
      },
    ],
    actionPlan: [
      {
        title: "Add cloud work",
        detail: "Show AWS use in a bullet.",
        impact: "high",
        effort: "medium",
        relatedRequirement: "AWS",
      },
    ],
  },
};

const job = {
  title: "Senior Backend Engineer",
  company: "Northwind Cloud",
  description: "We need Kubernetes.\n```\ncode\n```",
};

describe("reportToMarkdown", () => {
  const md = reportToMarkdown(report, job);

  it("starts with the target and instructions for the AI assistant", () => {
    expect(
      md.startsWith("# Resume improvement brief: Senior Backend Engineer at Northwind Cloud")
    ).toBe(true);
    expect(md.indexOf("## Instructions for the AI assistant")).toBeLessThan(
      md.indexOf("## Match summary")
    );
    expect(md).toContain("Never invent employers");
    expect(md).toContain("spearheaded");
  });

  it("includes the score, reachable score, and role summary", () => {
    expect(md).toContain("- Match score: 54/100 (Partial match)");
    expect(md).toMatch(/Reachable score if the top 3 gaps are fixed: about \d+\/100/);
    expect(md).toContain("What this role looks for: Backend depth plus cloud operations.");
  });

  it("escapes pipes in the requirements table", () => {
    expect(md).toContain("| TypeScript \\| Node.js | Required | Met |");
    expect(md).toContain("| Kubernetes | Required | Missing | Not shown |");
  });

  it("lists only open edits, highest priority first, with confirm-first flags", () => {
    expect(md).not.toContain("Already handled");
    expect(md.indexOf("Quantify the ingestion work")).toBeLessThan(md.indexOf("Add Kubernetes"));
    expect(md).toContain('- Current: "Built a Node.js service"');
    expect(md).toContain("- Confirm first:");
  });

  it("includes plan, benchmarks, writing issues, and missing keywords", () => {
    expect(md).toContain("1. **Add cloud work** (high impact, medium effort).");
    expect(md).toContain("### Projects (Missing)");
    expect(md).toContain("  - Built [project] using [tool]");
    expect(md).toContain("- First-person pronouns: 2 lines use I or my.");
    expect(md).not.toContain("Email address");
    expect(md).toContain("- Kubernetes (required)");
  });

  it("keeps the job description inside one code block", () => {
    const fence = md.indexOf("```text");
    expect(fence).toBeGreaterThan(0);
    expect(md.slice(fence).match(/```/g)).toHaveLength(2);
  });

  it("works for older analyses without insights", () => {
    const plain = reportToMarkdown({ ...report, insights: null }, { ...job, description: "" });
    expect(plain).not.toContain("## Plan");
    expect(plain).not.toContain("## Job description");
  });
});

describe("reportFileName", () => {
  it("makes a safe slug", () => {
    expect(
      reportFileName({ title: "Sr. Backend Engineer (Remote)", company: "Northwind/Cloud" })
    ).toBe("resume-match-sr-backend-engineer-remote-northwind-cloud");
  });
});
