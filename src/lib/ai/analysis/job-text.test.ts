import { describe, expect, it } from "vitest";
import { cleanJobDescription, jobFingerprintText } from "./job-text";
import { EVAL_CASES } from "./__fixtures__/eval-cases";

describe("cleanJobDescription", () => {
  it("removes company blurb, benefits, and EEO text but keeps every requirement", () => {
    for (const c of EVAL_CASES) {
      const cleaned = cleanJobDescription(c.jobDescription);
      expect(cleaned).not.toMatch(/equal opportunity employer/i);
      expect(cleaned).not.toMatch(/dental/i);
      expect(cleaned).not.toMatch(/dog-friendly/i);
      expect(cleaned.length).toBeLessThan(c.jobDescription.length * 0.75);
      // Every bullet from the requirement sections survives
      const bullets = c.jobDescription
        .split("\n")
        .filter((l) => l.startsWith("- ") && !/insurance|vacation|salary|hybrid work/i.test(l));
      for (const b of bullets) expect(cleaned).toContain(b);
    }
  });

  it("keeps 'About the role' sections and stops skipping at a requirements heading", () => {
    const jd = `About Acme
Acme makes rockets.

About the role
You will build telemetry dashboards.

Benefits:
- Free lunch

Requirements:
- Go and Kafka`;
    const cleaned = cleanJobDescription(jd);
    expect(cleaned).not.toContain("makes rockets");
    expect(cleaned).toContain("You will build telemetry dashboards.");
    expect(cleaned).not.toContain("Free lunch");
    expect(cleaned).toContain("- Go and Kafka");
  });

  it("treats 'About you' as requirements", () => {
    const cleaned = cleanJobDescription(
      "About Acme\nWe sell boats.\n\nAbout you\n- 3 years of Rust"
    );
    expect(cleaned).toContain("- 3 years of Rust");
    expect(cleaned).not.toContain("We sell boats.");
  });

  it("drops EEO sentences inside a kept paragraph but keeps the rest", () => {
    const cleaned = cleanJobDescription(
      "We need strong SQL skills. We are an equal opportunity employer."
    );
    expect(cleaned).toBe("We need strong SQL skills.");
  });

  it("fingerprints ignore whitespace, case, and boilerplate edits", () => {
    const a = "Requirements:\n- Python   and SQL\n\nBenefits\n- Gym";
    const b = "requirements:\n-  python and sql\nBenefits\n- Gym and free snacks";
    expect(jobFingerprintText(a)).toBe(jobFingerprintText(b));
    expect(jobFingerprintText(a)).not.toBe(jobFingerprintText("Requirements:\n- Python"));
  });
});
