import type { IChecklistItem, IChecklistKeyword } from "@/models/ResumeChecklist";

export interface AnalysisInput {
  jobDescription: string;
  resumeText: string;
  jobTitle: string;
  companyName: string;
}

export interface AnalysisResult {
  items: Partial<IChecklistItem>[];
  keywords: Partial<IChecklistKeyword>[];
}

export interface ChecklistAnalyzer {
  analyze(input: AnalysisInput, keywords?: Partial<IChecklistKeyword>[]): Partial<IChecklistItem>[] | Promise<Partial<IChecklistItem>[]>;
}
