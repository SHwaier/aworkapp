import type { FormatCheck } from "./types";
import { AI_BUZZWORDS } from "./buzzwords";

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

  return [...checks, ...runWritingChecks(lines)];
}

const FIRST_PERSON = /\b(I|[Mm]e|[Mm]y|[Mm]ine|[Ww]e|[Oo]ur|us)\b/;
const DUTY_PHRASES = /\b(responsible for|duties included|tasked with|in charge of)\b/i;
const HAS_RESULT = /\d|%|\$|€|£/;

/** A line long enough to be an experience/project bullet rather than a heading or contact line. */
function isBulletLike(line: string): boolean {
  return line.split(/\s+/).length >= 7 && !line.includes("@");
}

/**
 * Writing-quality checks from the analysis reference (Harvard, MIT, AI
 * ResumeGuru, Enhancv) that can be measured reliably in text.
 */
export function runWritingChecks(lines: string[]): FormatCheck[] {
  const checks: FormatCheck[] = [];
  // Skip the header block (name, contact details) for pronoun checks
  const body = lines.slice(3);
  const bullets = lines.filter(isBulletLike);

  const pronounLines = body.filter((l) => FIRST_PERSON.test(l)).length;
  checks.push(
    pronounLines === 0
      ? {
          id: "pronouns",
          label: "No first-person pronouns",
          status: "pass",
          detail: "Written without I, me, my, or we.",
        }
      : {
          id: "pronouns",
          label: "First-person pronouns",
          status: "warn",
          detail: `${pronounLines} line${pronounLines === 1 ? "" : "s"} use I, me, my, or we. Resumes are implicitly about you; start bullets with the action instead.`,
        }
  );

  const dutyLines = lines.filter((l) => DUTY_PHRASES.test(l)).length;
  checks.push(
    dutyLines === 0
      ? {
          id: "duties",
          label: "Action-led bullets",
          status: "pass",
          detail: "No “responsible for”-style duty phrasing.",
        }
      : {
          id: "duties",
          label: "Duty-style phrasing",
          status: "warn",
          detail: `${dutyLines} line${dutyLines === 1 ? "" : "s"} describe duties (“responsible for”, “tasked with”). Lead with what you did and the result.`,
        }
  );

  if (bullets.length >= 3) {
    const withResults = bullets.filter((l) => HAS_RESULT.test(l)).length;
    const share = withResults / bullets.length;
    checks.push(
      share >= 0.4
        ? {
            id: "results",
            label: "Results shown",
            status: "pass",
            detail: `${withResults} of ${bullets.length} bullets include a number, percentage, or amount.`,
          }
        : {
            id: "results",
            label: "Few measurable results",
            status: "warn",
            detail: `Only ${withResults} of ${bullets.length} bullets include a number, percentage, or amount. Add results, scale, or scope where you can.`,
          }
    );
  }

  const text = lines.join("\n").toLowerCase();
  const found = AI_BUZZWORDS.map((word) => ({
    word,
    count: (
      text.match(new RegExp(`(^|[^a-z])${word.replace(/[-\s]/g, "[-\\s]?")}(?=$|[^a-z])`, "g")) ??
      []
    ).length,
  })).filter((b) => b.count > 0);
  const total = found.reduce((sum, b) => sum + b.count, 0);
  const repeated = found.some((b) => b.count >= 2);
  checks.push(
    total === 0
      ? {
          id: "buzzwords",
          label: "No AI-sounding buzzwords",
          status: "pass",
          detail: "Avoids filler like “spearheaded” or “leveraged”.",
        }
      : repeated || total >= 3
        ? {
            id: "buzzwords",
            label: "AI-sounding buzzwords",
            status: "warn",
            detail: `Uses ${found.map((b) => (b.count > 1 ? `“${b.word}” ×${b.count}` : `“${b.word}”`)).join(", ")}. Recruiters read these as AI filler; name the tools and outcomes instead.`,
          }
        : {
            id: "buzzwords",
            label: "Buzzwords",
            status: "pass",
            detail: `Uses ${found.map((b) => `“${b.word}”`).join(", ")} once — fine occasionally, but avoid repeating it.`,
          }
  );

  const emDashes = (lines.join("\n").match(/—/g) ?? []).length;
  if (emDashes >= 4) {
    checks.push({
      id: "em-dashes",
      label: "Many em-dashes",
      status: "warn",
      detail: `${emDashes} em-dashes. Heavy use has become a sign of AI-written text; prefer commas or shorter sentences.`,
    });
  }

  const longBullets = bullets.filter((l) => l.length > 220).length;
  checks.push(
    longBullets === 0
      ? {
          id: "bullet-length",
          label: "Concise bullets",
          status: "pass",
          detail: "Bullets fit in one or two lines.",
        }
      : {
          id: "bullet-length",
          label: "Long bullets",
          status: "warn",
          detail: `${longBullets} bullet${longBullets === 1 ? " is" : "s are"} longer than about two lines. Keep each to one or two lines so it can be scanned in seconds.`,
        }
  );

  return checks;
}
