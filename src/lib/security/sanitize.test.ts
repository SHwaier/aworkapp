import { describe, expect, it } from "vitest";
import { sanitizeMultiline, sanitizeText } from "./sanitize";

describe("sanitizeMultiline", () => {
  it("keeps line breaks but strips HTML and tidies spacing", () => {
    expect(
      sanitizeMultiline("Requirements:\r\n-  Go   and <b>SQL</b>\n\n\n\nBenefits\n- Gym  ")
    ).toBe("Requirements:\n- Go and SQL\n\nBenefits\n- Gym");
  });

  it("limits length", () => {
    expect(sanitizeMultiline("abcdef", 3)).toBe("abc");
  });

  it("differs from sanitizeText, which flattens everything to one line", () => {
    expect(sanitizeText("a\nb")).toBe("a b");
  });
});
