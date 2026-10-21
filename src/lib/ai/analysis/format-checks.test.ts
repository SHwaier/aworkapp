import { describe, expect, it } from "vitest";
import { runFormatChecks, runWritingChecks } from "./format-checks";
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

describe("runWritingChecks", () => {
  const header = ["Jordan Rivera", "jordan@example.com", "Summary"];
  const status = (lines: string[]) =>
    Object.fromEntries(runWritingChecks([...header, ...lines]).map((c) => [c.id, c.status]));
  const detail = (lines: string[], id: string) =>
    runWritingChecks([...header, ...lines]).find((c) => c.id === id)?.detail ?? "";

  it("passes clean, results-led bullets", () => {
    expect(
      status([
        "Cut API p95 latency from 800ms to 210ms by rewriting the caching layer",
        "Built a Node.js ingestion service processing 2M events per day",
        "Migrated 40 reporting jobs from cron scripts to a queue-based worker system",
      ])
    ).toMatchObject({
      pronouns: "pass",
      duties: "pass",
      results: "pass",
      buzzwords: "pass",
      "bullet-length": "pass",
    });
  });

  it("flags first-person pronouns, including at the start of a sentence", () => {
    expect(status(["We built the new billing system for our largest customers"]).pronouns).toBe(
      "warn"
    );
    expect(status(["I led the migration of the payments platform to Kubernetes"]).pronouns).toBe(
      "warn"
    );
  });

  it("doesn't flag pronouns in the name/contact header", () => {
    expect(
      runWritingChecks(["Me Myself", "my@example.com", "Summary"]).find((c) => c.id === "pronouns")
        ?.status
    ).toBe("pass");
  });

  it("flags duty-style phrasing and bullets without results", () => {
    const lines = [
      "Responsible for maintaining the internal reporting dashboards for the sales team",
      "Worked on backend services and helped the team with code reviews",
      "Handled customer tickets and escalated issues to the engineering team",
    ];
    expect(status(lines)).toMatchObject({ duties: "warn", results: "warn" });
  });

  it("flags repeated AI buzzwords, with whole-word matching", () => {
    const lines = [
      "Spearheaded the redesign of the onboarding flow for new enterprise customers",
      "Spearheaded a results-driven migration of legacy services to the cloud platform",
    ];
    expect(status(lines).buzzwords).toBe("warn");
    expect(detail(lines, "buzzwords")).toContain("“spearheaded” ×2");
    expect(detail(lines, "buzzwords")).toContain("results-driven");
    // "dynamically" must not count as "dynamic"
    expect(
      status(["Dynamically scaled worker pools based on queue depth across three regions"])
        .buzzwords
    ).toBe("pass");
  });

  it("flags long bullets and heavy em-dash use", () => {
    const long = "Built " + "a very detailed system ".repeat(12) + "that did many things";
    expect(status([long])["bullet-length"]).toBe("warn");
    expect(status(["One — two — three — four — five words in this line here"])["em-dashes"]).toBe(
      "warn"
    );
  });
});
