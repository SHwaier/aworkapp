import type { AnalysisRequirement, Coverage, Importance } from "./types";

// Pure scoring helpers, safe to import from client components.

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

export interface ScoreOpportunity {
  requirement: string;
  importance: Importance;
  coverage: Coverage;
  /** Points the score would gain if this requirement were fully met */
  gain: number;
}

/**
 * What-if analysis: for each requirement that isn't fully met, how many points
 * the match score would rise if only that requirement became "met".
 * Largest gains first.
 */
export function scoreOpportunities(
  requirements: Pick<AnalysisRequirement, "text" | "importance" | "coverage">[]
): ScoreOpportunity[] {
  const current = computeScore(requirements);
  return requirements
    .map((r, i): ScoreOpportunity | null => {
      if (r.coverage === "met") return null;
      const improved = requirements.map((other, j) =>
        j === i ? { ...other, coverage: "met" as const } : other
      );
      return {
        requirement: r.text,
        importance: r.importance,
        coverage: r.coverage,
        gain: computeScore(improved) - current,
      };
    })
    .filter((o): o is ScoreOpportunity => o !== null && o.gain > 0)
    .sort((a, b) => b.gain - a.gain);
}
