import type { FormatCheck } from "./types";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_OR_SITE = /(linkedin\.com\/in\/|github\.com\/|https?:\/\/)/i;

const SECTION_PATTERNS: Record<string, RegExp> = {
  Experience:
    /^(professional |work |relevant )?experience$|^employment( history)?$|^work history$/i,
  Education: /^education( (and|&) (training|certifications?))?$/i,
  Skills: /^(technical |core |key )?skills( (and|&) .+)?$|^technologies$|^competencies$/i,
};

/**
 * Deterministic checks that don't need AI. Only checks we can do reliably
 * from extracted text; anything subjective is left to the model.
 */
export function runFormatChecks(lines: string[], pageCount: number | null): FormatCheck[] {
  const text = lines.join("\n");
  const head = lines.slice(0, 8).join("\n");
  const words = text.split(/\s+/).filter(Boolean).length;
  const checks: FormatCheck[] = [];

  checks.push(
    EMAIL.test(head)
      ? { id: "email", label: "Email address", status: "pass", detail: "Found near the top." }
      : EMAIL.test(text)
        ? {
            id: "email",
            label: "Email address",
            status: "warn",
            detail: "Found, but not in the header. Recruiters look for it at the top.",
          }
        : { id: "email", label: "Email address", status: "warn", detail: "No email address found." }
  );

  checks.push(
    PHONE.test(head)
      ? { id: "phone", label: "Phone number", status: "pass", detail: "Found near the top." }
      : {
          id: "phone",
          label: "Phone number",
          status: "warn",
          detail: "No phone number found in the header.",
        }
  );

  checks.push(
    LINKEDIN_OR_SITE.test(text)
      ? {
          id: "links",
          label: "Profile links",
          status: "pass",
          detail: "Includes a LinkedIn, GitHub, or website link.",
        }
      : {
          id: "links",
          label: "Profile links",
          status: "warn",
          detail: "Consider adding a LinkedIn profile or portfolio link.",
        }
  );

  const headings = lines.filter((l) => l.length <= 40).map((l) => l.replace(/[:|]/g, "").trim());
  const missing = Object.entries(SECTION_PATTERNS)
    .filter(([, re]) => !headings.some((h) => re.test(h)))
    .map(([name]) => name);
  checks.push(
    missing.length === 0
      ? {
          id: "sections",
          label: "Standard sections",
          status: "pass",
          detail: "Experience, Education, and Skills headings found.",
        }
      : {
          id: "sections",
          label: "Standard sections",
          status: "warn",
          detail: `No clear ${missing.join(", ")} heading. Standard headings help applicant tracking systems parse your resume.`,
        }
  );

  if (pageCount !== null) {
    checks.push(
      pageCount <= 2
        ? {
            id: "length",
            label: "Length",
            status: "pass",
            detail: `${pageCount} page${pageCount === 1 ? "" : "s"}.`,
          }
        : {
            id: "length",
            label: "Length",
            status: "warn",
            detail: `${pageCount} pages. Most roles expect 1-2 pages.`,
          }
    );
  } else {
    checks.push(
      words <= 1100
        ? { id: "length", label: "Length", status: "pass", detail: `About ${words} words.` }
        : {
            id: "length",
            label: "Length",
            status: "warn",
            detail: `About ${words} words, likely over 2 pages.`,
          }
    );
  }

  if (words < 200) {
    checks.push({
      id: "content",
      label: "Amount of content",
      status: "warn",
      detail: `Only about ${words} words were readable. Check that the file isn't mostly images or text boxes.`,
    });
  }

  return checks;
}
