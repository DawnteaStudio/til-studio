import { authorizeAdminRequest } from "@/lib/auth/access";
import { existingSourceConflict } from "@/lib/content/paths";
import { sourcePathForNote } from "@/lib/content/source-readme";
import { ManagedReadmeError } from "@/lib/content/managed-readme";
import { NextResponse } from "next/server";
import { z } from "zod";
import { planRepositoryChanges } from "@/lib/github/change-planner";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";
import { fetchPublishPreview, isPublishPath, PublishConflict, snapshotFileReader } from "@/lib/github/publish";
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
  const denied = await authorizeAdminRequest(request);
  if (denied) return denied;
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
  const denied = await authorizeAdminRequest(request);
  if (denied) return denied;
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "저장 요청을 확인하세요." }, { status: 400 });
  const body = parsed.data;
  const expected = body.expected;
  if (expected && (body.changes.length !== 1 || body.changes[0].path !== expected.path)) {
    return NextResponse.json({ error: "미리 본 글과 저장할 글이 다릅니다." }, { status: 400 });
  }

  try {
    const snapshot = await fetchRepositoryMarkdownSnapshot();
    const { owner, repo, branch, headSha, allPaths } = snapshot;
    if (expected && (expected.owner !== owner || expected.repo !== repo || expected.branch !== branch)) {
      throw new PublishConflict();
    }

    const sourceTopics = body.sourceMetadata ? [...new Set(body.changes.map(({ path }) => sourcePathForNote(path))
      .filter((source): source is string => source !== null)
      .map((source) => source.slice(0, source.lastIndexOf("/notes/"))))] : [];
    function firstSourceConflict(paths: string[]) {
      if (!body.sourceMetadata) return null;
      for (const topic of sourceTopics) {
        const existing = existingSourceConflict(paths, topic, body.sourceMetadata.name);
        if (existing) return NextResponse.json(existing, { status: 409 });
      }
      return null;
    }
    const existing = firstSourceConflict(allPaths);
    if (existing) return existing;
    const readExisting = snapshotFileReader(snapshot);
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
    let result;
    try {
      result = await saveToGitHub({
        repository: { owner, repo, defaultBranch: branch }, plannedHeadSha: headSha,
        mode: body.mode, message: body.message, changes,
      });
    } catch (error) {
      if (error instanceof PublishConflict && sourceTopics.length) {
        const latest = await fetchRepositoryMarkdownSnapshot();
        if (latest.owner === owner && latest.repo === repo && latest.branch === branch) {
          const conflict = firstSourceConflict(latest.allPaths);
          if (conflict) return conflict;
        }
      }
      throw error;
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ManagedReadmeError) return NextResponse.json({ error: error.message }, { status: 422 });
    if (error instanceof PublishConflict) {
      return NextResponse.json({ error: "저장소가 변경되었습니다. 최신 내용과 다시 비교하세요." }, { status: 409 });
    }
    return NextResponse.json({ error: "GitHub 저장 요청이 실패했습니다. 설정과 권한을 확인하세요." }, { status: 502 });
  }
}
