import { NextResponse } from "next/server";
import { z } from "zod";
import { saveToGitHub } from "@/lib/github/save";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  mode: z.enum(["quick", "review"]),
  message: z.string().min(1),
  changes: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const body = saveSchema.parse(await request.json());
  const result = await saveToGitHub({
    repository: {
      owner: process.env.TIL_REPOSITORY_OWNER ?? "DawnteaStudio",
      repo: process.env.TIL_REPOSITORY_NAME ?? "TIL",
      defaultBranch: "main",
    },
    mode: body.mode,
    message: body.message,
    changes: body.changes,
  });

  return NextResponse.json(result);
}
