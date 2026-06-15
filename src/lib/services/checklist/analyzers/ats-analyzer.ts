import type { IChecklistItem } from "@/models/ResumeChecklist";
import { ChecklistAnalyzer, AnalysisInput } from "../types";
import { STANDARD_SECTION_HEADERS } from "../../checklist-dictionaries";

export class ATSAnalyzer implements ChecklistAnalyzer {
  analyze(input: AnalysisInput): Partial<IChecklistItem>[] {
    const items: Partial<IChecklistItem>[] = [];
    const resumeText = input.resumeText;
    const lines = resumeText.split("\n").filter((l) => l.trim());
    // Check standard headers

    // Check standard headers
    // Clean lines of markdown (like #, **, -, etc) to accurately detect headers
    const headerCandidates = lines.filter((l) => {
      const cleanLine = l.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      return cleanLine.length > 0 && cleanLine.length <= 40;
    });

    const standardLower = STANDARD_SECTION_HEADERS.map((h) => h.toLowerCase());
    // Deduplicate found headers to count distinct standard headers used
    const foundStandard = Array.from(
      new Set(
        headerCandidates.filter((h) => {
          const cleanH = h
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .toLowerCase();
          return (
            standardLower.includes(cleanH) ||
            standardLower.some((s) => cleanH.startsWith(s) || cleanH.endsWith(s))
          );
        })
      )
    );

    items.push({
      category: "ats_formatting",
      title: "Standard section headers used",
      description: `Found ${foundStandard.length} standard section headers.`,
      status: foundStandard.length >= 3 ? "complete" : "needs_review",
      severity: foundStandard.length >= 3 ? "info" : "warning",
      isAutoDetected: true,
      isUserDismissible: true,
      suggestion:
        foundStandard.length >= 3
          ? undefined
          : "Use recognizable headers like Education, Experience, Projects, Skills.",
    });

    // Check contact info
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const hasContact = emailRegex.test(resumeText) || phoneRegex.test(resumeText);

    items.push({
      category: "ats_formatting",
      title: "Contact information is plain text",
      description:
        "Ensure contact info (email, phone) appears as plain text, not in graphics or images.",
      status: hasContact ? "complete" : "needs_review",
      severity: hasContact ? "info" : "suggestion",
      isAutoDetected: true,
      isUserDismissible: true,
      suggestion: hasContact
        ? undefined
        : "Add your email and phone number as plain text at the top of your resume.",
    });

    items.push({
      category: "ats_formatting",
      title: "Resume avoids complex tables and columns",
      description: "Multi-column layouts and complex tables can confuse ATS parsers.",
      status: "not_started",
      severity: "suggestion",
      isAutoDetected: false,
      isUserDismissible: true,
    });

    items.push({
      category: "ats_formatting",
      title: "Resume uses readable fonts",
      description: "Stick to standard fonts like Calibri, Arial, or Times New Roman.",
      status: "not_started",
      severity: "info",
      isAutoDetected: false,
      isUserDismissible: true,
    });

    items.push({
      category: "ats_formatting",
      title: "DOCX export available for ATS submission",
      description: "DOCX is generally safer than PDF for ATS parsing.",
      status: "complete",
      severity: "info",
      isAutoDetected: true,
      isUserDismissible: false,
    });

    return items;
  }
}
