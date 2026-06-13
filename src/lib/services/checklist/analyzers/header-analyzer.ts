import type { IChecklistItem } from "@/models/ResumeChecklist";
import { ChecklistAnalyzer, AnalysisInput } from "../types";

export class HeaderAnalyzer implements ChecklistAnalyzer {
  analyze(input: AnalysisInput): Partial<IChecklistItem>[] {
    const items: Partial<IChecklistItem>[] = [];
    const t = input.resumeText;

    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t);
    const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(t);
    const hasLinkedIn = /linkedin\.com/i.test(t);
    const hasGitHub = /github\.com/i.test(t);
    const hasPortfolio = /portfolio|\.dev|\.io|\.com\/~|personal\s*site/i.test(t);

    items.push({
      category: "header",
      title: "Email address included",
      status: hasEmail ? "complete" : "not_started",
      severity: hasEmail ? "info" : "critical",
      isAutoDetected: true, isUserDismissible: true,
      suggestion: hasEmail ? "" : "Add your professional email address to the header.",
    });
    items.push({
      category: "header",
      title: "Phone number included",
      status: hasPhone ? "complete" : "not_started",
      severity: hasPhone ? "info" : "warning",
      isAutoDetected: true, isUserDismissible: true,
    });
    items.push({
      category: "header",
      title: "LinkedIn profile included",
      status: hasLinkedIn ? "complete" : "not_started",
      severity: hasLinkedIn ? "info" : "suggestion",
      isAutoDetected: true, isUserDismissible: true,
    });
    items.push({
      category: "header",
      title: "GitHub profile included",
      status: hasGitHub ? "complete" : "not_started",
      severity: hasGitHub ? "info" : "suggestion",
      isAutoDetected: true, isUserDismissible: true,
      suggestion: hasGitHub ? "" : "For technical roles, consider adding your GitHub link.",
    });
    items.push({
      category: "header",
      title: "Portfolio or personal website included",
      status: hasPortfolio ? "complete" : "not_started",
      severity: "info",
      isAutoDetected: true, isUserDismissible: true,
    });

    return items;
  }
}
