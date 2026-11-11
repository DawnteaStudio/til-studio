import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/auth/access";
import { isHostedMode } from "@/lib/auth/mode";
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

export async function GET(request: Request) {
  const denied = await authorizeAdminRequest(request);
  if (denied) return denied;
  return NextResponse.json(readSettingsSnapshot(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = await authorizeAdminRequest(request);
  if (denied) return denied;
  if (isHostedMode()) return NextResponse.json({ error: "배포 환경의 설정은 환경변수에서 변경하세요." }, { status: 403 });
  const body = settingsSchema.parse(await request.json());
  return NextResponse.json(saveRuntimeSettings(body));
}
