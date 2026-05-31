import { NextResponse } from "next/server";
import { verifyGitHubSignature } from "@/lib/github/webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
  }

  const isValid = verifyGitHubSignature({
    body,
    signature: request.headers.get("x-hub-signature-256"),
    secret,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  return NextResponse.json({
    accepted: true,
    event: request.headers.get("x-github-event"),
  });
}
