import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT } from "./prompt";
import { ATS_REFERENCE } from "./reference";
import { AI_BUZZWORDS } from "./buzzwords";

describe("analysis prompts", () => {
  it("lead with the full resume-writing reference, before the task", () => {
    expect(SYSTEM_PROMPT.startsWith("# Reference material")).toBe(true);
    expect(SYSTEM_PROMPT).toContain(ATS_REFERENCE);
    expect(SYSTEM_PROMPT.indexOf(ATS_REFERENCE)).toBeLessThan(SYSTEM_PROMPT.indexOf("# Your task"));
  });

  it("tell the model to avoid every listed AI buzzword", () => {
    for (const word of AI_BUZZWORDS) expect(SYSTEM_PROMPT).toContain(word);
  });

  it("apply the reference's context rule to coverage", () => {
    expect(SYSTEM_PROMPT).toMatch(/only appears in a skills list[\s\S]*"partial"/);
  });
});
