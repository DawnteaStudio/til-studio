import type { TheoryResearchResult } from "../schema";

export interface AIProvider {
  cleanupNote(markdown: string): Promise<string>;
  researchTheory(keyword: string): Promise<TheoryResearchResult>;
}
