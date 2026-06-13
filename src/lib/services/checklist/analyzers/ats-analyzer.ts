import type { IChecklistItem } from "@/models/ResumeChecklist";
import { ChecklistAnalyzer, AnalysisInput } from "../types";
import { STANDARD_SECTION_HEADERS } from "../../checklist-dictionaries";

export class ATSAnalyzer implements ChecklistAnalyzer {
  analyze(input: AnalysisInput): Partial<IChecklistItem>[] {
    const items: Partial<IChecklistItem>[] = [];
    const resumeText = input.resumeText;
    const lines = resumeText.split("\n").filter((l) => l.trim());
    const headerLines = lines.filter((l) => l.trim().length < 40 && /^[A-Z]/.test(l.trim()));

    // Check standard headers
    const standardLower = STANDARD_SECTION_HEADERS.map((h) => h.toLowerCase());
    const foundStandard = headerLines.filter((h) =>
      standardLower.some((s) => h.trim().toLowerCase().includes(s))
    );

    items.push({
      category: "ats_formatting",
      title: "Standard section headers used",
      description: `Found ${foundStandard.length} standard section headers.`,
      status: foundStandard.length >= 3 ? "complete" : "needs_review",
      severity: foundStandard.length >= 3 ? "info" : "warning",
      isAutoDetected: true, isUserDismissible: true,
      suggestion: "Use recognizable headers like Education, Experience, Projects, Skills.",
    });

    items.push({
      category: "ats_formatting",
      title: "Contact information is plain text",
      description: "Ensure contact info (email, phone) appears as plain text, not in graphics or images.",
      status: "not_started",
      severity: "suggestion",
      isAutoDetected: false, isUserDismissible: true,
    });

    items.push({
      category: "ats_formatting",
      title: "Resume avoids complex tables and columns",
      description: "Multi-column layouts and complex tables can confuse ATS parsers.",
      status: "not_started",
      severity: "suggestion",
      isAutoDetected: false, isUserDismissible: true,
    });

    items.push({
      category: "ats_formatting",
      title: "Resume uses readable fonts",
      description: "Stick to standard fonts like Calibri, Arial, or Times New Roman.",
      status: "not_started",
      severity: "info",
      isAutoDetected: false, isUserDismissible: true,
    });

    items.push({
      category: "ats_formatting",
      title: "DOCX export available for ATS submission",
      description: "DOCX is generally safer than PDF for ATS parsing.",
      status: "complete",
      severity: "info",
      isAutoDetected: true, isUserDismissible: false,
    });

    return items;
  }
}
