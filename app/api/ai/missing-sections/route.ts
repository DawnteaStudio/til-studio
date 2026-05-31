import { NextResponse } from "next/server";
import { z } from "zod";
import { findMissingSections } from "@/lib/ai/service";

export const dynamic = "force-dynamic";

const schema = z.object({ markdown: z.string().min(1) });

export async function POST(request: Request) {
  const { markdown } = schema.parse(await request.json());
  const result = await findMissingSections(markdown);
  return NextResponse.json(result);
}
