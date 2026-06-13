import { AnalysisInput, AnalysisResult, ChecklistAnalyzer } from "./types";
import { extractKeywords } from "./keyword-extraction-service";
import { JobMatchAnalyzer } from "./analyzers/job-match-analyzer";
import { ATSAnalyzer } from "./analyzers/ats-analyzer";
import { HeaderAnalyzer } from "./analyzers/header-analyzer";
import { SectionAnalyzer } from "./analyzers/section-analyzer";
import { BulletQualityAnalyzer } from "./analyzers/bullet-quality-analyzer";
import { FinalReviewAnalyzer } from "./analyzers/final-review-analyzer";
import { AIAnalyzer } from "./analyzers/ai-analyzer";

export class ChecklistGenerationService {
  private analyzers: ChecklistAnalyzer[];

  constructor() {
    this.analyzers = [
      new JobMatchAnalyzer(),
      new ATSAnalyzer(),
      new HeaderAnalyzer(),
      new SectionAnalyzer(),
      new BulletQualityAnalyzer(),
      new FinalReviewAnalyzer(),
      new AIAnalyzer(),
    ];
  }

  public async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    const { jobDescription, resumeText } = input;
    
    // Extract keywords
    const keywords = extractKeywords(jobDescription, resumeText);
    
    // Run all analyzers concurrently
    const itemsPromises = this.analyzers.map((analyzer) => analyzer.analyze(input, keywords));
    const itemsArrays = await Promise.all(itemsPromises);
    const items = itemsArrays.flat();

    return { items, keywords };
  }

  /** Compute overall score from checklist items */
  public computeScore(items: { status: string }[]): number {
    if (items.length === 0) return 0;
    const done = items.filter((i) =>
      ["complete", "ignored", "not_applicable"].includes(i.status)
    ).length;
    return Math.round((done / items.length) * 100);
  }
}
