import { NextResponse } from "next/server";
import { z } from "zod";
import { planRepositoryChanges } from "@/lib/github/change-planner";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";
import { createInstallationOctokit } from "@/lib/github/client";
import { fetchPublishPreview, isPublishPath, PublishConflict, readPublishFile } from "@/lib/github/publish";
import { saveToGitHub } from "@/lib/github/save";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  mode: z.enum(["quick", "review"]),
  message: z.string().min(1),
  expected: z.object({
    owner: z.string(), repo: z.string(), branch: z.string(),
    path: z.string().refine(isPublishPath), sha: z.string().min(1).nullable(),
  }).optional(),
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

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path || !isPublishPath(path)) {
    return NextResponse.json({ error: "글 경로를 확인하세요." }, { status: 400 });
  }
  try {
    return NextResponse.json(await fetchPublishPreview(path), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "GitHub의 현재 파일을 확인하지 못했습니다." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "저장 요청을 확인하세요." }, { status: 400 });
  const body = parsed.data;
  const expected = body.expected;
  if (expected && (body.changes.length !== 1 || body.changes[0].path !== expected.path)) {
    return NextResponse.json({ error: "미리 본 글과 저장할 글이 다릅니다." }, { status: 400 });
  }

  try {
    const { owner, repo, branch, headSha, allPaths } = await fetchRepositoryMarkdownSnapshot();
    if (expected && (expected.owner !== owner || expected.repo !== repo || expected.branch !== branch)) {
      throw new PublishConflict();
    }

    const client = await createInstallationOctokit();
    const paths = new Set(allPaths);
    async function readExisting(path: string) {
      if (!paths.has(path)) return null;
      const file = await readPublishFile(client, owner, repo, headSha, path);
      if (!file) throw new Error("Cannot read an indexed file");
      return file;
    }
    if (expected) {
      if (allPaths.some((path) => path.startsWith(expected.path + "/") || expected.path.startsWith(path + "/"))) {
        throw new PublishConflict();
      }
      const file = await readExisting(expected.path);
      if ((file?.sha ?? null) !== expected.sha) throw new PublishConflict();
    }
    const changes = await planRepositoryChanges({
      existingPaths: allPaths,
      requestedChanges: body.changes.map((change) => ({ ...change, operation: "upsert" })),
      readDocument: async (path) => (await readExisting(path))?.content ?? null,
      sourceMetadata: body.sourceMetadata,
    });
    const result = await saveToGitHub({
      repository: { owner, repo, defaultBranch: branch }, plannedHeadSha: headSha,
      mode: body.mode, message: body.message, changes,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublishConflict) {
      return NextResponse.json({ error: "저장소가 변경되었습니다. 최신 내용과 다시 비교하세요." }, { status: 409 });
    }
    return NextResponse.json({ error: "GitHub 저장 요청이 실패했습니다. 설정과 권한을 확인하세요." }, { status: 502 });
  }
}
