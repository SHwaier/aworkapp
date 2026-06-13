import { ChecklistGenerationService } from "./checklist/checklist-generation-service";
import { AnalysisInput, AnalysisResult } from "./checklist/types";

const service = new ChecklistGenerationService();

export async function analyzeResume(input: AnalysisInput): Promise<AnalysisResult> {
  return service.analyze(input);
}

export function computeScore(items: { status: string }[]): number {
  return service.computeScore(items);
}
