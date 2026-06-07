import { geminiProvider } from "./providers/gemini";
import { openAIProvider } from "./providers/openai";
import type { AIProvider } from "./providers/types";
import { theoryResearchSchema, type TheoryResearchResult } from "./schema";
import { parseModelJson } from "./utils";
import { getRuntimeSetting } from "@/lib/settings/runtime-settings";

export { parseModelJson, theoryResearchSchema };
export type { TheoryResearchResult };

export type AIProviderName = "openai" | "gemini";

export function getAIProviderName(): AIProviderName {
  const value = getRuntimeSetting("AI_PROVIDER")?.trim().toLowerCase();
  return value === "gemini" ? "gemini" : "openai";
}

function provider(): AIProvider {
  return getAIProviderName() === "gemini" ? geminiProvider : openAIProvider;
}

export async function cleanupNote(markdown: string): Promise<string> {
  return provider().cleanupNote(markdown);
}

export async function researchTheory(keyword: string): Promise<TheoryResearchResult> {
  return provider().researchTheory(keyword);
}
