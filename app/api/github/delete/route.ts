import { authorizeAdminRequest } from "@/lib/auth/access";
import { ManagedReadmeError } from "@/lib/content/managed-readme";
import { NextResponse } from "next/server";
import { z } from "zod";
import { planRepositoryChanges } from "@/lib/github/change-planner";
import {
  fetchRepositoryMarkdownSnapshot,
} from "@/lib/github/repository";
import { saveToGitHub } from "@/lib/github/save";
import { PublishConflict, snapshotFileReader } from "@/lib/github/publish";

export const dynamic = "force-dynamic";

const notePathPattern =
  /^[^/]+\/[^/]+\/notes\/[^/]+\/note\/[^/]+\.md$/;

const deleteSchema = z.object({
  mode: z.enum(["quick", "review"]),
  path: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  const denied = await authorizeAdminRequest(request);
  if (denied) return denied;
  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success || !isSafeNotePath(parsed.data.path)) {
    return NextResponse.json(
      { error: "삭제할 note 경로가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const snapshot = await fetchRepositoryMarkdownSnapshot();
  if (!snapshot.allPaths.includes(body.path)) {
    return NextResponse.json(
      { error: "삭제할 note를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  try {
    const readFile = snapshotFileReader(snapshot);
    const changes = await planRepositoryChanges({
      existingPaths: snapshot.allPaths,
      requestedChanges: [{ operation: "delete", path: body.path }],
      readDocument: async (path) =>
        (await readFile(path))?.content ?? null,
    });
    const result = await saveToGitHub({
      repository: {
        owner: snapshot.owner,
        repo: snapshot.repo,
        defaultBranch: snapshot.branch,
      },
      plannedHeadSha: snapshot.headSha,
      mode: body.mode,
      message: body.message,
      changes,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ManagedReadmeError) return NextResponse.json({ error: error.message }, { status: 422 });
    const message = error instanceof Error ? error.message : "";
    if (error instanceof PublishConflict || message.startsWith("GitHub deletion target does not exist:")) {
      return NextResponse.json(
        { error: "note가 이미 변경되었거나 삭제되었습니다." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "GitHub 삭제 요청에 실패했습니다." },
      { status: 500 },
    );
  }
}

function isSafeNotePath(path: string): boolean {
  const segments = path.split("/");
  return (
    notePathPattern.test(path) &&
    !segments.some((segment) => segment === "." || segment === "..")
  );
}
