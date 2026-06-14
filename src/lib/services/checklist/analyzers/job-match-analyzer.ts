import type { IChecklistItem, IChecklistKeyword } from "@/models/ResumeChecklist";
import { ChecklistAnalyzer, AnalysisInput } from "../types";

export class JobMatchAnalyzer implements ChecklistAnalyzer {
  analyze(
    input: AnalysisInput,
    keywords?: Partial<IChecklistKeyword>[]
  ): Partial<IChecklistItem>[] {
    const items: Partial<IChecklistItem>[] = [];
    const { jobDescription } = input;

    // Job description present?
    items.push({
      category: "job_match",
      title: "Job description imported",
      description: jobDescription
        ? "The job description is available for analysis."
        : "Paste the job description to enable keyword matching.",
      status: jobDescription ? "complete" : "not_started",
      severity: jobDescription ? "info" : "critical",
      isAutoDetected: true,
      isUserDismissible: false,
    });

    if (!jobDescription || !keywords) return items;

    const missing = keywords.filter((k) => !k.appearsInResume);

    // Per-keyword items for missing required/preferred
    for (const kw of missing.filter((k) => k.requirementLevel !== "nice_to_have").slice(0, 15)) {
      items.push({
        category: "job_match",
        title: `Add "${kw.keyword}" if supported by your experience`,
        description: `"${kw.keyword}" appears ${kw.frequency} time(s) in the job description but is not in your resume.`,
        status: "not_started",
        severity: kw.requirementLevel === "required" ? "warning" : "suggestion",
        isAutoDetected: true,
        isUserDismissible: true,
        relatedKeyword: kw.keyword,
        suggestion: `Add "${kw.keyword}" naturally in your Skills section or a relevant bullet — only if you can honestly discuss it in an interview.`,
      });
    }

    return items;
  }
}
