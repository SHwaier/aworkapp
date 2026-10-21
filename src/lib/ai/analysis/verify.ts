import type { AiAnalysisOutput } from "./schema";
import type {
  AnalysisKeyword,
  AnalysisRequirement,
  AnalysisSuggestion,
  Coverage,
  Importance,
} from "./types";

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
      importance: req.importance,
      coverage,
      claimedCoverage: req.coverage,
      evidence,
      evidenceVerified: verified,
      note: req.note,
    };
  });
}

export function verifyKeywords(
  keywords: AiAnalysisOutput["keywords"],
  resumeText: string
): AnalysisKeyword[] {
  const seen = new Set<string>();
  const out: AnalysisKeyword[] = [];
  for (const kw of keywords) {
    const key = kw.term.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
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

const WEIGHT: Record<Importance, number> = { required: 2, preferred: 1 };
const CREDIT: Record<Coverage, number> = { met: 1, partial: 0.5, missing: 0 };

/**
 * Match score, 0-100, computed from verified requirement coverage.
 * Required requirements count double; partial coverage earns half credit.
 */
export function computeScore(
  requirements: Pick<AnalysisRequirement, "importance" | "coverage">[]
): number {
  const max = requirements.reduce((sum, r) => sum + WEIGHT[r.importance], 0);
  if (max === 0) return 0;
  const earned = requirements.reduce(
    (sum, r) => sum + WEIGHT[r.importance] * CREDIT[r.coverage],
    0
  );
  return Math.round((earned / max) * 100);
}
