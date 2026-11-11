import { authorizeAdminRequest } from "@/lib/auth/access";
import { NextResponse } from "next/server";
import { z } from "zod";
import { researchTheory } from "@/lib/ai/service";

const requestSchema = z.object({
  keyword: z.string().min(1),
});

export async function POST(request: Request) {
  const denied = await authorizeAdminRequest(request);
  if (denied) return denied;
  try {
    const body = requestSchema.parse(await request.json());
    const result = await researchTheory(body.keyword);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Theory research failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
