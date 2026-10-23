import { describe, expect, it } from "vitest";
import {
  buildMatchPrompt,
  DEFAULT_REFERENCE_MODE,
  fullSystemPrompt,
  matchSystemPrompt,
} from "./prompt";
import { ATS_REFERENCE } from "./reference";
import { RESUME_RULEBOOK } from "./rulebook";
import { AI_BUZZWORDS } from "./buzzwords";
import type { JobProfile } from "./types";

describe("analysis prompts", () => {
  it("lead with the rules, before the task, with an identical opening for both calls", () => {
    for (const mode of ["condensed", "full"] as const) {
      const full = fullSystemPrompt(mode);
      const match = matchSystemPrompt(mode);
      expect(full.startsWith("# Reference material")).toBe(true);
      const opening = full.slice(0, full.indexOf("# Task"));
      expect(match.startsWith(opening)).toBe(true);
    }
    expect(fullSystemPrompt("full")).toContain(ATS_REFERENCE);
    expect(fullSystemPrompt("condensed")).toContain(RESUME_RULEBOOK);
    expect(fullSystemPrompt("condensed")).not.toContain(ATS_REFERENCE);
  });

  it("tell the model to avoid every listed AI buzzword", () => {
    for (const word of AI_BUZZWORDS)
      expect(fullSystemPrompt(DEFAULT_REFERENCE_MODE)).toContain(word);
  });

  it("apply the context rule to coverage in both calls", () => {
    expect(fullSystemPrompt()).toMatch(/only appears in a skills list[\s\S]*"partial"/);
    expect(matchSystemPrompt()).toMatch(/only appears in a skills list[\s\S]*"partial"/);
  });

  it("send a re-analysis the saved requirement list instead of the job description", () => {
    const profile: JobProfile = {
      seniority: "senior",
      roleSummary: "Backend depth.",
      requirements: [{ text: "Go", category: "skill", importance: "required" }],
      keywords: [{ term: "Go", importance: "required" }],
      benchmarks: [{ area: "skills", title: "Languages", typical: "Go and SQL." }],
    };
    const prompt = buildMatchPrompt(
      {
        jobTitle: "Engineer",
        companyName: "Acme",
        jobDescription: "LONG POSTING",
        resumeLines: ["Built X in Go"],
      },
      profile
    );
    expect(prompt).toContain("1. [required, skill] Go");
    expect(prompt).toContain("1. [skills] Languages: Go and SQL.");
    expect(prompt).toContain("L1: Built X in Go");
    expect(prompt).not.toContain("LONG POSTING");
  });
});
