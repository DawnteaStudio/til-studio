import { NextResponse } from "next/server";
import { z } from "zod";
import { readmePathForContentPath } from "@/lib/content/topic-readme";
import { fetchRepositoryMarkdownDocument, fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";
import { buildTopicReadmeChanges, saveToGitHub } from "@/lib/github/save";

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
  const snapshot = await fetchRepositoryMarkdownSnapshot();
  const readmePaths = [
    ...new Set(
      body.changes
        .map((change) => change.path)
        .filter((path) => path.endsWith(".md"))
        .map(readmePathForContentPath)
        .filter((path): path is string => Boolean(path)),
    ),
  ];
  const existingReadmes = Object.fromEntries(
    await Promise.all(
      readmePaths.map(async (path) => {
        const document = await fetchRepositoryMarkdownDocument(path);
        return [path, document?.body ?? null] as const;
      }),
    ),
  );
  const readmeChanges = buildTopicReadmeChanges({
    existingPaths: snapshot.paths,
    incomingChanges: body.changes,
    existingReadmes,
  });
  const result = await saveToGitHub({
    repository: {
      owner: process.env.TIL_REPOSITORY_OWNER ?? "DawnteaStudio",
      repo: process.env.TIL_REPOSITORY_NAME ?? "TIL",
      defaultBranch: "main",
    },
    mode: body.mode,
    message: body.message,
    changes: [...body.changes, ...readmeChanges],
  });

  return NextResponse.json(result);
}
