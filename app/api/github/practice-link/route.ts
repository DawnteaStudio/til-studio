import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ManagedReadmeError } from "@/lib/content/managed-readme";
import { sourcePracticeSlugs } from "@/lib/content/paths";
import { isValidPracticeName, linkExistingPractice, PracticeMetadataError } from "@/lib/content/practice-links";
import { sourcePathForNote } from "@/lib/content/source-readme";
import { deriveStudyTarget } from "@/lib/content/studio-target";
import { planRepositoryChanges } from "@/lib/github/change-planner";
import { isPublishPath, PublishConflict, snapshotFileReader } from "@/lib/github/publish";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";
import { saveToGitHub } from "@/lib/github/save";

const requestSchema = z.object({
  mode: z.enum(["quick", "review"]),
  path: z.string().refine(path => isPublishPath(path) && path.split("/").length === 6 &&
    !path.split("/").some(part => part.startsWith(".") || /\p{Cc}/u.test(part)) &&
    Boolean(deriveStudyTarget(path) && sourcePathForNote(path))),
  practice: z.string().refine(isValidPracticeName),
  expected: z.object({
    owner: z.string().min(1), repo: z.string().min(1), branch: z.string().min(1),
    path: z.string().min(1), sha: z.string().min(1),
  }),
}).refine(({ path, expected }) => path === expected.path);

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "글 경로와 실습 폴더, 미리 확인한 글 버전을 확인하세요." }, { status: 400 });
  const { path, practice, expected, mode } = parsed.data;
  try {
    const snapshot = await fetchRepositoryMarkdownSnapshot();
    const { owner, repo, branch, headSha, allPaths } = snapshot;
    if (owner !== expected.owner || repo !== expected.repo || branch !== expected.branch) throw new PublishConflict();
    const source = sourcePathForNote(path)!;
    const available = sourcePracticeSlugs(allPaths, source);
    if (!available.includes(practice)) {
      return NextResponse.json({ error: "같은 자료에서 실습 파일을 찾을 수 없습니다. 목록을 새로 확인하세요." }, { status: 409 });
    }
    const read = snapshotFileReader(snapshot);
    const file = await read(path);
    if (!file) throw new PublishConflict();
    const slug = path.slice(path.lastIndexOf("/") + 1, -3);
    const content = linkExistingPractice(file.content, slug, available, practice);
    // A lost response or another writer may have already fulfilled this exact request.
    if (content === file.content) return NextResponse.json({ mode, branch, alreadyLinked: true });
    if (file.sha !== expected.sha) throw new PublishConflict();
    const changes = await planRepositoryChanges({
      existingPaths: allPaths, requestedChanges: [{ operation: "upsert", path, content }],
      readDocument: async key => (await read(key))?.content ?? null,
    });
    const reviewKey = mode === "review"
      ? createHash("sha256").update(JSON.stringify([owner, repo, branch, expected.sha, path, practice])).digest("hex")
      : undefined;
    return NextResponse.json(await saveToGitHub({
      repository: { owner, repo, defaultBranch: branch }, plannedHeadSha: headSha, reviewKey,
      mode, message: `Link practice ${practice} to ${slug}`, changes,
    }));
  } catch (error) {
    if (error instanceof PracticeMetadataError || error instanceof ManagedReadmeError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof PublishConflict) {
      return NextResponse.json({ error: "글이나 저장소가 변경되었습니다. 최신 내용을 다시 확인하세요." }, { status: 409 });
    }
    return NextResponse.json({ error: "GitHub 연결 저장에 실패했습니다. 설정과 권한을 확인하세요." }, { status: 502 });
  }
}
