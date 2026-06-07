import OpenAI from "openai";
import { createNoteCleanupUserPrompt, noteCleanupSystemPrompt, theoryResearchSystemPrompt } from "../prompts";
import { theoryResearchSchema, type TheoryResearchResult } from "../schema";
import { parseModelJson } from "../utils";
import type { AIProvider } from "./types";
import { getRuntimeSetting } from "@/lib/settings/runtime-settings";

function client(): OpenAI {
  const apiKey = getRuntimeSetting("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  return new OpenAI({ apiKey });
}

export function getOpenAIModel(): string {
  return getRuntimeSetting("OPENAI_MODEL") || "gpt-4o-mini-2024-07-18";
}

export const openAIProvider: AIProvider = {
  async cleanupNote(markdown: string): Promise<string> {
    const response = await client().responses.create({
      model: getOpenAIModel(),
      input: [
        { role: "system", content: noteCleanupSystemPrompt },
        { role: "user", content: createNoteCleanupUserPrompt(markdown) },
      ],
    });

    return response.output_text;
  },

  async researchTheory(keyword: string): Promise<TheoryResearchResult> {
    const response = await client().responses.create({
      model: getOpenAIModel(),
      tools: [{ type: "web_search" }] as never,
      input: [
        { role: "system", content: theoryResearchSystemPrompt },
        { role: "user", content: `Research this concept for a theory note: ${keyword}` },
      ],
    });

    return theoryResearchSchema.parse(parseModelJson(response.output_text));
  },
};
