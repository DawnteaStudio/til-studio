import OpenAI from "openai";
import { z } from "zod";
import { missingSectionsSystemPrompt, noteCleanupSystemPrompt } from "./prompts";

const missingSectionsSchema = z.object({
  missingSections: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});

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

export async function findMissingSections(markdown: string): Promise<{
  missingSections: string[];
  followUpQuestions: string[];
}> {
  const response = await client().responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: missingSectionsSystemPrompt },
      { role: "user", content: markdown },
    ],
  });

  return missingSectionsSchema.parse(JSON.parse(response.output_text));
}
