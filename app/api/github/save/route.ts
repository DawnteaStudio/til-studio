import { NextResponse } from "next/server";
import { z } from "zod";
import { sourceReadmePathForNote } from "@/lib/content/source-readme";
import { readmePathForContentPath } from "@/lib/content/topic-readme";
import { fetchRepositoryMarkdownDocument, fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";
import {
  buildSourceReadmeChanges,
  buildTopicReadmeChanges,
  saveToGitHub,
} from "@/lib/github/save";
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
      technologies: z.array(z.string()).optional(),
      references: z.array(z.string()).optional(),
    })
    .optional(),
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
  const sourceReadmePaths = [
    ...new Set(
      body.changes
        .map((change) => sourceReadmePathForNote(change.path))
        .filter((path): path is string => Boolean(path)),
    ),
  ];
  const existingSourceReadmes = Object.fromEntries(
    await Promise.all(
      sourceReadmePaths.map(async (path) => {
        const document = await fetchRepositoryMarkdownDocument(path);
        return [path, document?.body ?? null] as const;
      }),
    ),
  );
  const affectedSourcePaths = sourceReadmePaths.map((path) =>
    path.replace(/\/README\.md$/i, ""),
  );
  const existingNotePaths = snapshot.paths.filter((path) =>
    affectedSourcePaths.some(
      (sourcePath) => path.startsWith(`${sourcePath}/note/`) && path.endsWith(".md"),
    ),
  );
  const noteContents = Object.fromEntries(
    await Promise.all(
      existingNotePaths.map(async (path) => {
        const document = await fetchRepositoryMarkdownDocument(path);
        return [path, document?.body ?? null] as const;
      }),
    ),
  );
  const sourceReadmeChanges = buildSourceReadmeChanges({
    existingPaths: snapshot.allPaths,
    incomingChanges: body.changes,
    existingReadmes: existingSourceReadmes,
    noteContents,
    sourceMetadata: body.sourceMetadata,
  });
  const readmeChanges = buildTopicReadmeChanges({
    existingPaths: snapshot.paths,
    incomingChanges: body.changes,
    existingReadmes,
  });
  const result = await saveToGitHub({
    repository: {
      owner: getRuntimeSetting("TIL_REPOSITORY_OWNER") ?? "DawnteaStudio",
      repo: getRuntimeSetting("TIL_REPOSITORY_NAME") ?? "TIL",
      defaultBranch: "main",
    },
    mode: body.mode,
    message: body.message,
    changes: [...body.changes, ...sourceReadmeChanges, ...readmeChanges],
  });

  return NextResponse.json(result);
}
