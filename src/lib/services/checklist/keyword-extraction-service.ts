import type { IChecklistKeyword } from "@/models/ResumeChecklist";
import {
  ALL_TECH_KEYWORDS_SET,
  TECH_KEYWORD_DISPLAY,
  TECH_KEYWORD_CATEGORY,
  SOFT_SKILLS,
} from "../checklist-dictionaries";

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFlexiblePattern(keyword: string): string {
  // Allow spaces, hyphens, or underscores between words in a keyword
  return escapeRegex(keyword).replace(/\\ /g, "[\\s\\-_]+");
}

export function wordBoundaryMatch(text: string, keyword: string): boolean {
  const pattern = new RegExp(`\\b${buildFlexiblePattern(keyword)}\\b`, "i");
  return pattern.test(text);
}

export function countOccurrences(text: string, keyword: string): number {
  const pattern = new RegExp(`\\b${buildFlexiblePattern(keyword)}\\b`, "gi");
  return (text.match(pattern) || []).length;
}

export function extractKeywords(jobDesc: string, resumeText: string): Partial<IChecklistKeyword>[] {
  const keywords: Partial<IChecklistKeyword>[] = [];
  const seen = new Set<string>();
  const jobLower = jobDesc.toLowerCase();
  const resumeLower = resumeText.toLowerCase();

  // 1. Technical keywords
  for (const kw of ALL_TECH_KEYWORDS_SET) {
    if (wordBoundaryMatch(jobLower, kw)) {
      const display = TECH_KEYWORD_DISPLAY.get(kw) || kw;
      const catRaw = TECH_KEYWORD_CATEGORY.get(kw) || "other";
      const cat = ["tools", "testing"].includes(catRaw) ? "tool" as const
        : catRaw === "programming_languages" ? "technical_skill" as const
        : ["frontend", "backend", "databases", "cloud_devops", "mobile", "security", "data_ai"].includes(catRaw) ? "technical_skill" as const
        : "other" as const;

      const inResume = wordBoundaryMatch(resumeLower, kw);
      const freq = countOccurrences(jobLower, kw);
      seen.add(kw);

      keywords.push({
        keyword: display,
        category: cat,
        requirementLevel: freq >= 3 ? "required" : freq >= 2 ? "preferred" : "nice_to_have",
        appearsInJob: true,
        appearsInResume: inResume,
        recommendation: inResume ? "keep" : "add_only_if_true",
        frequency: freq,
      });
    }
  }

  // 2. Soft skills
  for (const skill of SOFT_SKILLS) {
    const skLower = skill.toLowerCase();
    if (seen.has(skLower)) continue;
    if (wordBoundaryMatch(jobLower, skLower)) {
      const inResume = wordBoundaryMatch(resumeLower, skLower);
      seen.add(skLower);
      keywords.push({
        keyword: skill,
        category: "soft_skill",
        requirementLevel: "preferred",
        appearsInJob: true,
        appearsInResume: inResume,
        recommendation: inResume ? "keep" : "add_only_if_true",
        frequency: countOccurrences(jobLower, skLower),
      });
    }
  }

  return keywords;
}
