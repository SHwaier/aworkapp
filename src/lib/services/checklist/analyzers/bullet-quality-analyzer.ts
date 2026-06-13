import type { IChecklistItem } from "@/models/ResumeChecklist";
import { ChecklistAnalyzer, AnalysisInput } from "../types";
import { WEAK_VERB_PATTERNS, ALL_ACTION_VERBS_SET, ACTION_VERBS } from "../../checklist-dictionaries";

/** Extract bullet-like lines (lines starting with •, -, *, or action verbs) */
function extractBullets(text: string): string[] {
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10 && (
      /^[•\-*▪►➤]/.test(l) ||
      /^[A-Z][a-z]+ed\b/.test(l) ||
      /^[A-Z][a-z]+ing\b/.test(l)
    ));
}

export class BulletQualityAnalyzer implements ChecklistAnalyzer {
  analyze(input: AnalysisInput): Partial<IChecklistItem>[] {
    const items: Partial<IChecklistItem>[] = [];
    const resumeText = input.resumeText;
    const bullets = extractBullets(resumeText);

    if (bullets.length === 0) {
      items.push({
        category: "bullet_quality",
        title: "No bullet points detected",
        description: "Could not detect bullet points in the resume text. This may be a formatting issue.",
        status: "needs_review",
        severity: "warning",
        isAutoDetected: true, isUserDismissible: true,
      });
      return items;
    }

    // Check for weak verb patterns
    const weakBullets: string[] = [];
    for (const bullet of bullets) {
      const bLower = bullet.toLowerCase();
      for (const pattern of WEAK_VERB_PATTERNS) {
        if (bLower.startsWith(pattern) || bLower.includes(pattern)) {
          weakBullets.push(bullet.slice(0, 80));
          break;
        }
      }
    }

    if (weakBullets.length > 0) {
      items.push({
        category: "bullet_quality",
        title: `${weakBullets.length} bullet(s) use weak phrasing`,
        description: `Found phrases like "Responsible for" or "Worked on". Replace with strong action verbs.`,
        status: "needs_review",
        severity: "warning",
        isAutoDetected: true, isUserDismissible: true,
        suggestion: `Example weak phrasing: "${weakBullets[0]}..."`,
      });
    }

    // Check bullets starting with action verbs
    let actionVerbCount = 0;
    for (const bullet of bullets) {
      const cleaned = bullet.replace(/^[•\-*▪►➤]\s*/, "");
      const firstWord = cleaned.split(/\s/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
      if (firstWord && ALL_ACTION_VERBS_SET.has(firstWord)) {
        actionVerbCount++;
      }
    }

    items.push({
      category: "bullet_quality",
      title: `${actionVerbCount} of ${bullets.length} bullets start with action verbs`,
      status: actionVerbCount >= bullets.length * 0.7 ? "complete" : "needs_review",
      severity: actionVerbCount >= bullets.length * 0.7 ? "info" : "suggestion",
      isAutoDetected: true, isUserDismissible: true,
      suggestion: "Start each bullet with a strong action verb like Built, Developed, Designed, or Optimized.",
    });

    // Check for metrics
    const metricsCount = bullets.filter((b) => /\d+%|\d+x|\$\d|[0-9]{2,}/.test(b)).length;
    items.push({
      category: "bullet_quality",
      title: `${metricsCount} of ${bullets.length} bullets include metrics or numbers`,
      status: metricsCount >= bullets.length * 0.3 ? "complete" : "not_started",
      severity: metricsCount >= bullets.length * 0.3 ? "info" : "suggestion",
      isAutoDetected: true, isUserDismissible: true,
      suggestion: "Add measurable results where possible (e.g., \"Increased performance by 25%\").",
    });

    // Count verb frequency
    const verbCounts = new Map<string, number>();
    for (const bullet of bullets) {
      const cleaned = bullet.replace(/^[•\-*▪►➤]\s*/, "");
      const firstWord = cleaned.split(/\s/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
      if (firstWord && ALL_ACTION_VERBS_SET.has(firstWord)) {
        verbCounts.set(firstWord, (verbCounts.get(firstWord) || 0) + 1);
      }
    }

    // Detect repeated verbs
    let repeatedVerbs = 0;
    for (const [verb, count] of verbCounts) {
      if (count >= 3) {
        repeatedVerbs++;
        // Find alternatives from the same category
        let alternatives: string[] = [];
        for (const [, verbs] of Object.entries(ACTION_VERBS)) {
          if (verbs.some((v) => v.toLowerCase() === verb)) {
            alternatives = verbs
              .filter((v) => v.toLowerCase() !== verb)
              .slice(0, 5);
            break;
          }
        }

        items.push({
          category: "action_verbs",
          title: `"${verb.charAt(0).toUpperCase() + verb.slice(1)}" used ${count} times`,
          description: `Consider varying your action verbs for variety.`,
          status: "needs_review",
          severity: "suggestion",
          isAutoDetected: true, isUserDismissible: true,
          suggestion: alternatives.length > 0
            ? `Try replacing some with: ${alternatives.join(", ")}`
            : "Try using different action verbs for variety.",
        });
      }
    }

    if (repeatedVerbs === 0) {
      items.push({
        category: "action_verbs",
        title: "Good verb variety",
        description: "No excessively repeated action verbs detected.",
        status: "complete",
        severity: "info",
        isAutoDetected: true, isUserDismissible: false,
      });
    }

    return items;
  }
}
