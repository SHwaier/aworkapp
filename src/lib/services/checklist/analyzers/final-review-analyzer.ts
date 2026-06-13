import type { IChecklistItem } from "@/models/ResumeChecklist";
import { ChecklistAnalyzer, AnalysisInput } from "../types";

export class FinalReviewAnalyzer implements ChecklistAnalyzer {
  analyze(): Partial<IChecklistItem>[] {
    return [
      {
        category: "final_review",
        title: "Resume is tailored to this specific job",
        status: "not_started",
        severity: "info",
        isAutoDetected: false, isUserDismissible: true,
      },
      {
        category: "final_review",
        title: "Contact information is correct and up to date",
        status: "not_started",
        severity: "info",
        isAutoDetected: false, isUserDismissible: true,
      },
      {
        category: "final_review",
        title: "Important job keywords are covered honestly",
        status: "not_started",
        severity: "info",
        isAutoDetected: false, isUserDismissible: true,
      },
      {
        category: "final_review",
        title: "No unsupported skills are listed",
        description: "Every skill listed should be backed by a project, experience, or coursework.",
        status: "not_started",
        severity: "info",
        isAutoDetected: false, isUserDismissible: true,
      },
      {
        category: "final_review",
        title: "Resume is ready for export and submission",
        status: "not_started",
        severity: "info",
        isAutoDetected: false, isUserDismissible: true,
      },
    ];
  }
}
