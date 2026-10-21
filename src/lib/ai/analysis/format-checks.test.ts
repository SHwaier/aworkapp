import { describe, expect, it } from "vitest";
import { runFormatChecks } from "./format-checks";
import { SAMPLE_RESUME } from "./__fixtures__/sample";

const byId = (checks: ReturnType<typeof runFormatChecks>) =>
  Object.fromEntries(checks.map((c) => [c.id, c.status]));

describe("runFormatChecks", () => {
  it("passes a well-formed resume", () => {
    const checks = byId(runFormatChecks(SAMPLE_RESUME.split("\n"), 1));
    expect(checks).toMatchObject({
      email: "pass",
      phone: "pass",
      links: "pass",
      sections: "pass",
      length: "pass",
    });
  });

  it("flags missing contact details, sections and long resumes", () => {
    const lines = ["Jordan Rivera", "Projects", "Built things"];
    const checks = byId(runFormatChecks(lines, 4));
    expect(checks).toMatchObject({
      email: "warn",
      phone: "warn",
      sections: "warn",
      length: "warn",
      content: "warn",
    });
  });

  it("estimates length from words when the page count is unknown (DOCX)", () => {
    const long = Array.from({ length: 300 }, () => "word word word word word").join("\n");
    expect(byId(runFormatChecks(long.split("\n"), null)).length).toBe("warn");
  });
});
