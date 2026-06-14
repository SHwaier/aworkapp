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

  public async analyze(
    input: AnalysisInput,
    mode: "static" | "ai" | "all" = "all"
  ): Promise<AnalysisResult> {
    const { jobDescription, resumeText } = input;

    // Extract keywords (only need to extract them if we are doing static or all)
    const keywords = mode === "ai" ? [] : extractKeywords(jobDescription, resumeText);

    // Run selected analyzers concurrently
    const activeAnalyzers = this.analyzers.filter((a) => {
      const isAi = !!a.isAi;
      if (mode === "static") return !isAi;
      if (mode === "ai") return isAi;
      return true;
    });

    const itemsPromises = activeAnalyzers.map((analyzer) => analyzer.analyze(input, keywords));
    const itemsArrays = await Promise.all(itemsPromises);
    const items = itemsArrays.flat();

    return { items, keywords: mode === "ai" ? [] : keywords };
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
