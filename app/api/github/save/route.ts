import { NextResponse } from "next/server";
import { z } from "zod";
import { planRepositoryChanges } from "@/lib/github/change-planner";
import {
  fetchRepositoryMarkdownDocument,
  fetchRepositoryMarkdownSnapshot,
} from "@/lib/github/repository";
import { saveToGitHub } from "@/lib/github/save";
import { getRuntimeSetting } from "@/lib/settings/runtime-settings";

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
  sourceMetadata: z
    .object({
      name: z.string().min(1),
      type: z.enum(["book", "lecture", "mentoring", "course", "etc"]),
      overview: z.string().optional(),
      technologies: z
        .array(
          z.union([
            z.string(),
            z.object({
              name: z.string().min(1),
              badge: z
                .object({
                  label: z.string(),
                  color: z.string(),
                  logo: z.string(),
                  logoColor: z.string(),
                })
                .optional(),
            }),
          ]),
        )
        .optional(),
      references: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const body = saveSchema.parse(await request.json());
  const snapshot = await fetchRepositoryMarkdownSnapshot();
  const requestedChanges = body.changes.map((change) => ({
    operation: "upsert" as const,
    path: change.path,
    content: change.content,
  }));
  const changes = await planRepositoryChanges({
    existingPaths: snapshot.allPaths,
    requestedChanges,
    readDocument: async (path) =>
      (await fetchRepositoryMarkdownDocument(path))?.body ?? null,
    sourceMetadata: body.sourceMetadata,
  });
  const result = await saveToGitHub({
    repository: {
      owner: getRuntimeSetting("TIL_REPOSITORY_OWNER") ?? "DawnteaStudio",
      repo: getRuntimeSetting("TIL_REPOSITORY_NAME") ?? "TIL",
      defaultBranch: snapshot.branch,
    },
    mode: body.mode,
    message: body.message,
    changes,
  });

  return NextResponse.json(result);
}
