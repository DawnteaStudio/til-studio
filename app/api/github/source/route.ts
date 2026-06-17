import { NextResponse } from "next/server";
import { z } from "zod";
import { makeSlug } from "@/lib/content/paths";
import { upsertSourceReadme } from "@/lib/content/source-readme";
import { planRepositoryChanges } from "@/lib/github/change-planner";
import {
  fetchRepositoryMarkdownDocument,
  fetchRepositoryMarkdownSnapshot,
} from "@/lib/github/repository";
import { saveToGitHub } from "@/lib/github/save";
import { getRuntimeSetting } from "@/lib/settings/runtime-settings";

export const dynamic = "force-dynamic";

const sourceMetadataSchema = z.object({
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
});

const sourceSchema = z.object({
  mode: z.enum(["quick", "review"]),
  topicPath: z.string().min(1),
  sourceName: z.string().min(1),
  sourceMetadata: sourceMetadataSchema,
});

export async function POST(request: Request) {
  const body = sourceSchema.parse(await request.json());
  if (!isSafeTopicPath(body.topicPath)) {
    return NextResponse.json({ error: "Unsafe topic path" }, { status: 400 });
  }

  const sourceSlug = makeSlug(body.sourceName);
  if (!sourceSlug) {
    return NextResponse.json({ error: "Invalid source name" }, { status: 400 });
  }

  const sourcePath = `${body.topicPath}/notes/${sourceSlug}`;
  const snapshot = await fetchRepositoryMarkdownSnapshot();
  const sourceMetadata = {
    ...body.sourceMetadata,
    name: body.sourceMetadata.name.trim(),
  };
  const requestedChanges = [
    {
      operation: "upsert" as const,
      path: `${sourcePath}/README.md`,
      content: upsertSourceReadme({
        sourcePath,
        metadata: sourceMetadata,
        existingContent: null,
        notes: [],
        srcSlugs: [],
      }),
    },
    {
      operation: "upsert" as const,
      path: `${sourcePath}/note/.gitkeep`,
      content: "",
    },
    {
      operation: "upsert" as const,
      path: `${sourcePath}/src/.gitkeep`,
      content: "",
    },
  ];
  const changes = await planRepositoryChanges({
    existingPaths: snapshot.allPaths,
    requestedChanges,
    readDocument: async (path) =>
      (await fetchRepositoryMarkdownDocument(path))?.body ?? null,
    sourceMetadata,
  });

  const result = await saveToGitHub({
    repository: {
      owner: getRuntimeSetting("TIL_REPOSITORY_OWNER") ?? "DawnteaStudio",
      repo: getRuntimeSetting("TIL_REPOSITORY_NAME") ?? "TIL",
      defaultBranch: snapshot.branch,
    },
    mode: body.mode,
    message: "Create TIL source workspace from til-studio",
    changes,
  });

  return NextResponse.json(result);
}

function isSafeTopicPath(path: string): boolean {
  const segments = path.split("/");
  return (
    segments.length >= 2 &&
    segments.every(
      (segment) =>
        segment.length > 0 &&
        segment !== "." &&
        segment !== ".." &&
        !segment.includes("\\"),
    )
  );
}
