import type { AiAnalysisOutput } from "./schema";
import type { AnalysisKeyword, AnalysisRequirement, AnalysisSuggestion, Coverage } from "./types";

/** Lowercase and collapse whitespace/punctuation runs for tolerant quote matching. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-term match that also works for terms like "C++", "C#", ".NET", "Node.js",
 * where \b fails next to punctuation. Spaces/hyphens are interchangeable.
 */
export function containsTerm(text: string, term: string): boolean {
  const t = term.trim();
  if (!t) return false;
  const pattern = escapeRegex(t.toLowerCase()).replace(/[\s-]+/g, "[\\s\\-_]+");
  return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`, "i").test(text.toLowerCase());
}

const DOWNGRADE: Record<Coverage, Coverage> = {
  met: "partial",
  partial: "missing",
  missing: "missing",
};

/**
 * Accept the model's coverage only when its evidence checks out against the resume:
 * cited lines must exist and, if a quote is given, it must appear in those lines
 * (or anywhere in the resume). Unsupported claims are downgraded one level.
 */
export function verifyRequirements(
  requirements: AiAnalysisOutput["requirements"],
  lines: string[]
): AnalysisRequirement[] {
  const fullText = normalizeForMatch(lines.join("\n"));

  return requirements.map((req) => {
    const citedLines = req.evidenceLines
      .filter((n) => n >= 1 && n <= lines.length)
      .map((n) => lines[n - 1]);
    const quote = normalizeForMatch(req.evidenceQuote);

    let evidence = "";
    let verified = false;
    if (req.coverage !== "missing") {
      if (quote) {
        const inCited = citedLines.some((l) => normalizeForMatch(l).includes(quote));
        if (inCited || fullText.includes(quote)) {
          verified = true;
          evidence =
            citedLines.find((l) => normalizeForMatch(l).includes(quote)) ?? req.evidenceQuote;
        }
      } else if (citedLines.length > 0) {
        verified = true;
        evidence = citedLines[0];
      }
    }

    const coverage =
      req.coverage === "missing" || verified ? req.coverage : DOWNGRADE[req.coverage];

    return {
      text: req.text,
      category: req.category,
      importance: req.importance,
      coverage,
      claimedCoverage: req.coverage,
      evidence,
      evidenceVerified: verified,
      note: req.note,
    };
  });
}

/** Words too generic to be useful ATS keywords, even if the model suggests them. */
const GENERIC_KEYWORDS = new Set([
  "production",
  "scalable",
  "scalability",
  "senior",
  "junior",
  "lead",
  "engineer",
  "engineering",
  "developer",
  "development",
  "software",
  "experience",
  "years",
  "team",
  "teams",
]);

export function verifyKeywords(
  keywords: AiAnalysisOutput["keywords"],
  resumeText: string
): AnalysisKeyword[] {
  const seen = new Set<string>();
  const out: AnalysisKeyword[] = [];
  for (const kw of keywords) {
    const key = kw.term.trim().toLowerCase();
    if (!key || seen.has(key) || GENERIC_KEYWORDS.has(key)) continue;
    seen.add(key);
    out.push({
      term: kw.term.trim(),
      importance: kw.importance,
      inResume: containsTerm(resumeText, kw.term),
    });
  }
  return out;
}

/**
 * Fill in the original text for bullet rewrites from the resume (never from the model)
 * and drop suggestions that point at lines that don't exist or change nothing.
 */
export function verifySuggestions(
  suggestions: AiAnalysisOutput["suggestions"],
  lines: string[]
): AnalysisSuggestion[] {
  const out: AnalysisSuggestion[] = [];
  for (const s of suggestions) {
    const lineText = s.line >= 1 && s.line <= lines.length ? lines[s.line - 1] : "";
    if (s.type === "rewrite_bullet") {
      if (!lineText) continue;
      if (normalizeForMatch(lineText) === normalizeForMatch(s.suggestedText)) continue;
    }
    if (!s.suggestedText.trim()) continue;
    out.push({
      type: s.type,
      priority: s.priority,
      title: s.title,
      original: s.type === "rewrite_bullet" ? lineText : "",
      suggestedText: s.suggestedText.trim(),
      rationale: s.rationale,
      requiresVerification: s.requiresVerification,
    });
  }
  return out;
}

/**
 * Wrap job keywords the resume doesn't support in [brackets] wherever they appear
 * outside brackets, so illustrative examples can't be copied in as false claims.
 */
export function bracketUnsupportedTerms(text: string, missingTerms: string[]): string {
  const terms = [...missingTerms].filter((t) => t.trim()).sort((a, b) => b.length - a.length);
  // Split into bracketed and unbracketed segments; only touch the latter
  return text
    .split(/(\[[^\]]*\])/)
    .map((segment) => {
      if (segment.startsWith("[")) return segment;
      let out = segment;
      for (const term of terms) {
        const pattern = escapeRegex(term).replace(/[\s-]+/g, "[\\s\\-_]+");
        out = out.replace(
          new RegExp(`(^|[^a-z0-9\\[])(${pattern})(?=$|[^a-z0-9\\]])`, "gi"),
          (_m, pre: string, word: string) => `${pre}[${word}]`
        );
      }
      return out;
    })
    .join("");
}

/**
 * The model sees numbered resume lines ("L12") and sometimes mentions them in
 * prose, e.g. "(e.g., L7, L12)" or "bullet L9". Replace those references with a
 * short quote of the line so users never see internal line numbers. Only those
 * two forms are touched, so real text like "L2 cache" or "L5 engineer" survives.
 */
export function resolveLineRefs(text: string, lines: string[]): string {
  const quote = (n: string) => {
    const line = lines[Number(n) - 1];
    if (!line) return null;
    const words = line.split(/\s+/);
    return `“${words.slice(0, 6).join(" ")}${words.length > 6 ? "…" : ""}”`;
  };

  return (
    text
      // "(L7)", "(e.g., L7, L12)", "(lines L3-L4)"
      .replace(
        /\s*\(((?:e\.g\.,?\s*|lines?\s*)?L\d{1,4}(?:\s*(?:,|and|-|–)\s*L\d{1,4})*)\)/gi,
        (match, inner: string) => {
          const quotes = [...inner.matchAll(/L(\d{1,4})/g)].map((m) => quote(m[1]));
          if (quotes.some((q) => q === null)) return match;
          return ` (${quotes.join(", ")})`;
        }
      )
      // "bullet L9", "line L3"
      .replace(/\b(bullets?|lines?)\s+L(\d{1,4})\b/gi, (match, word: string, n: string) => {
        const q = quote(n);
        return q ? `${word} ${q}` : match;
      })
  );
}

export { computeScore } from "./scoring";
