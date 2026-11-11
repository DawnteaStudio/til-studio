import { authorizeAdminRequest } from "@/lib/auth/access";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cleanupNote } from "@/lib/ai/service";

export const dynamic = "force-dynamic";

const schema = z.object({ markdown: z.string().min(1) });

export async function POST(request: Request) {
  const denied = await authorizeAdminRequest(request);
  if (denied) return denied;
  const { markdown } = schema.parse(await request.json());
  const cleaned = await cleanupNote(markdown);
  return NextResponse.json({ markdown: cleaned });
}
