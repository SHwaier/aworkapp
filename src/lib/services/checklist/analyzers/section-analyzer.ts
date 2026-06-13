import type { IChecklistItem } from "@/models/ResumeChecklist";
import { ChecklistAnalyzer, AnalysisInput } from "../types";

export class SectionAnalyzer implements ChecklistAnalyzer {
  analyze(input: AnalysisInput): Partial<IChecklistItem>[] {
    const items: Partial<IChecklistItem>[] = [];
    const resumeText = input.resumeText;
    const tLower = resumeText.toLowerCase();

    // Education
    const hasEducation = /\b(education|university|college|bachelor|master|degree|diploma)\b/i.test(resumeText);
    items.push({
      category: "education",
      title: "Education section included",
      status: hasEducation ? "complete" : "not_started",
      severity: hasEducation ? "info" : "warning",
      isAutoDetected: true, isUserDismissible: true,
    });

    if (hasEducation) {
      const hasGradDate = /\b(20[0-9]{2}|expected|graduating|present)\b/i.test(resumeText);
      items.push({
        category: "education",
        title: "Graduation or expected graduation date included",
        status: hasGradDate ? "complete" : "not_started",
        severity: "suggestion",
        isAutoDetected: true, isUserDismissible: true,
      });
    }

    // Skills
    const hasSkills = /\b(skills|technical skills|core competencies)\b/i.test(resumeText);
    items.push({
      category: "skills",
      title: "Skills section included",
      status: hasSkills ? "complete" : "not_started",
      severity: hasSkills ? "info" : "warning",
      isAutoDetected: true, isUserDismissible: true,
    });

    // Projects
    const hasProjects = /\b(projects|personal projects|technical projects)\b/i.test(resumeText);
    items.push({
      category: "projects",
      title: "Projects section included",
      status: hasProjects ? "complete" : "not_started",
      severity: hasProjects ? "info" : "suggestion",
      isAutoDetected: true, isUserDismissible: true,
      suggestion: "For technical roles, 2–3 strong projects can demonstrate ability.",
    });

    if (hasProjects) {
      const hasGithubLinks = (tLower.match(/github\.com/g) || []).length;
      items.push({
        category: "projects",
        title: hasGithubLinks > 0
          ? `${hasGithubLinks} GitHub link(s) found in resume`
          : "Add GitHub links to projects",
        status: hasGithubLinks > 0 ? "complete" : "not_started",
        severity: "suggestion",
        isAutoDetected: true, isUserDismissible: true,
      });
    }

    // Experience
    const hasExperience = /\b(experience|work experience|professional experience|employment)\b/i.test(resumeText);
    items.push({
      category: "experience",
      title: "Experience section included",
      status: hasExperience ? "complete" : "not_started",
      severity: hasExperience ? "info" : "suggestion",
      isAutoDetected: true, isUserDismissible: true,
    });

    return items;
  }
}
