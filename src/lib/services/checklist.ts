import { ChecklistGenerationService } from "./checklist/checklist-generation-service";
import { AnalysisInput, AnalysisResult } from "./checklist/types";

const service = new ChecklistGenerationService();

export async function analyzeResume(input: AnalysisInput, mode: "static" | "ai" | "all" = "all"): Promise<AnalysisResult> {
  return service.analyze(input, mode);
}

export function computeScore(items: { status: string }[]): number {
  return service.computeScore(items);
}
