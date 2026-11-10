import { NextResponse } from "next/server";
import { z } from "zod";
import { existingSourceConflict, makeSlug } from "@/lib/content/paths";
import { upsertSourceReadme } from "@/lib/content/source-readme";
import { planRepositoryChanges } from "@/lib/github/change-planner";
import {
  fetchRepositoryMarkdownSnapshot,
} from "@/lib/github/repository";
import { saveToGitHub } from "@/lib/github/save";
import { PublishConflict, snapshotFileReader } from "@/lib/github/publish";
import { ManagedReadmeError } from "@/lib/content/managed-readme";

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
  const parsed = sourceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid source request" }, { status: 400 });
  const body = parsed.data;
  if (!isSafeTopicPath(body.topicPath)) {
    return NextResponse.json({ error: "Unsafe topic path" }, { status: 400 });
  }

  const sourceSlug = makeSlug(body.sourceName);
  if (!sourceSlug) {
    return NextResponse.json({ error: "Invalid source name" }, { status: 400 });
  }

  const sourcePath = `${body.topicPath}/notes/${sourceSlug}`;
  const snapshot = await fetchRepositoryMarkdownSnapshot();
  const existing = existingSourceConflict(snapshot.allPaths, body.topicPath, body.sourceName);
  if (existing) return NextResponse.json(existing, { status: 409 });
  if (snapshot.allPaths.some((path) => path === sourcePath || sourcePath.startsWith(path + "/"))) {
    return NextResponse.json({ error: "source_path_conflict" }, { status: 409 });
  }
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
  try {
    const readFile = snapshotFileReader(snapshot);
    const changes = await planRepositoryChanges({
      existingPaths: snapshot.allPaths,
      requestedChanges,
      readDocument: async (path) =>
        (await readFile(path))?.content ?? null,
      sourceMetadata,
    });

    const result = await saveToGitHub({
      repository: {
        owner: snapshot.owner,
        repo: snapshot.repo,
        defaultBranch: snapshot.branch,
      },
      plannedHeadSha: snapshot.headSha,
      mode: body.mode,
      message: "Create TIL source workspace from til-studio",
      changes,
    });

    return NextResponse.json({ ...result, sourceName: sourceSlug });
  } catch (error) {
    if (error instanceof PublishConflict) {
      const latest = await fetchRepositoryMarkdownSnapshot();
      if (latest.owner === snapshot.owner && latest.repo === snapshot.repo && latest.branch === snapshot.branch) {
        const existing = existingSourceConflict(latest.allPaths, body.topicPath, body.sourceName);
        if (existing) return NextResponse.json(existing, { status: 409 });
      }
      return NextResponse.json({ error: "repository_changed" }, { status: 409 });
    }
    if (error instanceof ManagedReadmeError) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ error: "학습 자료를 생성하지 못했습니다." }, { status: 502 });
  }
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
