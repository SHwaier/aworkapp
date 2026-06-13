import { ChecklistGenerationService } from "./checklist/checklist-generation-service";
import { AnalysisInput, AnalysisResult } from "./checklist/types";

const service = new ChecklistGenerationService();

export function analyzeResume(input: AnalysisInput): AnalysisResult {
  return service.analyze(input);
}

export function computeScore(items: { status: string }[]): number {
  return service.computeScore(items);
}
