import { createNoteCleanupUserPrompt, noteCleanupSystemPrompt, theoryResearchSystemPrompt } from "../prompts";
import { theoryResearchSchema, type TheoryResearchResult } from "../schema";
import { parseModelJson } from "../utils";
import type { AIProvider } from "./types";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: {
          title?: string;
          uri?: string;
        };
      }>;
    };
  }>;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function getGeminiApiKey(): string {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  return process.env.GEMINI_API_KEY;
}

function geminiText(response: GeminiResponse): string {
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function groundingSources(response: GeminiResponse): Array<{ title: string; url: string }> {
  return (
    response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk) => chunk.web)
      .filter((web): web is { title?: string; uri?: string } => Boolean(web?.uri))
      .map((web) => ({ title: web.title?.trim() || web.uri!, url: web.uri! })) ?? []
  );
}

async function generateContent(input: {
  systemInstruction: string;
  userText: string;
  useGoogleSearch?: boolean;
}): Promise<GeminiResponse> {
  const model = encodeURIComponent(getGeminiModel());
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getGeminiApiKey()}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: input.systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input.userText }],
          },
        ],
        tools: input.useGoogleSearch ? [{ google_search: {} }] : undefined,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini API request failed: ${response.status} ${detail}`);
  }

  return (await response.json()) as GeminiResponse;
}

export const geminiProvider: AIProvider = {
  async cleanupNote(markdown: string): Promise<string> {
    const response = await generateContent({
      systemInstruction: noteCleanupSystemPrompt,
      userText: createNoteCleanupUserPrompt(markdown),
    });

    return geminiText(response);
  },

  async researchTheory(keyword: string): Promise<TheoryResearchResult> {
    const response = await generateContent({
      systemInstruction: theoryResearchSystemPrompt,
      userText: `Research this concept for a theory note: ${keyword}`,
      useGoogleSearch: true,
    });
    const parsed = theoryResearchSchema.parse(parseModelJson(geminiText(response)));

    return {
      ...parsed,
      sources: parsed.sources.length ? parsed.sources : groundingSources(response),
    };
  },
};
