import OpenAI from "openai";
import { z } from "zod";
import {
  noteCleanupSystemPrompt,
  theoryResearchSystemPrompt,
} from "./prompts";

export const theoryResearchSchema = z.object({
  title: z.string(),
  concept: z.string(),
  keyPoints: z.array(z.string()),
  cautions: z.array(z.string()),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

export type TheoryResearchResult = z.infer<typeof theoryResearchSchema>;

function client(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function cleanupNote(markdown: string): Promise<string> {
  const response = await client().responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: noteCleanupSystemPrompt },
      { role: "user", content: markdown },
    ],
  });

  return response.output_text;
}

export async function researchTheory(keyword: string): Promise<TheoryResearchResult> {
  const response = await client().responses.create({
    model: "gpt-4.1-mini",
    tools: [{ type: "web_search" }] as never,
    input: [
      { role: "system", content: theoryResearchSystemPrompt },
      { role: "user", content: `Research this concept for a theory note: ${keyword}` },
    ],
  });

  return theoryResearchSchema.parse(JSON.parse(response.output_text));
}
