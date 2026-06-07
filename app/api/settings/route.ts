import { NextResponse } from "next/server";
import { z } from "zod";
import { readSettingsSnapshot, saveRuntimeSettings } from "@/lib/settings/runtime-settings";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  aiProvider: z.enum(["openai", "gemini"]).optional(),
  openAIModel: z.string().optional(),
  openAIKey: z.string().optional(),
  geminiModel: z.string().optional(),
  geminiKey: z.string().optional(),
  repositoryOwner: z.string().optional(),
  repositoryName: z.string().optional(),
  githubAppId: z.string().optional(),
  githubInstallationId: z.string().optional(),
  githubPrivateKey: z.string().optional(),
  githubWebhookSecret: z.string().optional(),
});

export function GET() {
  return NextResponse.json(readSettingsSnapshot());
}

export async function POST(request: Request) {
  const body = settingsSchema.parse(await request.json());
  return NextResponse.json(saveRuntimeSettings(body));
}
