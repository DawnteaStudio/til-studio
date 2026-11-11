import { type NextRequest } from "next/server";
import { handlers } from "@/auth";
import { authConfigurationReady } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

function unavailable() {
  return Response.json({ error: "관리자 로그인 설정이 필요합니다." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  return authConfigurationReady() ? handlers.GET(request) : unavailable();
}

export async function POST(request: NextRequest) {
  return authConfigurationReady() ? handlers.POST(request) : unavailable();
}
