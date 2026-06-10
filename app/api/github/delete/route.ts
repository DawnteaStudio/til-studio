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

const notePathPattern =
  /^[^/]+\/[^/]+\/notes\/[^/]+\/note\/[^/]+\.md$/;

const deleteSchema = z.object({
  mode: z.enum(["quick", "review"]),
  path: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(request: Request) {
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
    const changes = await planRepositoryChanges({
      existingPaths: snapshot.allPaths,
      requestedChanges: [{ operation: "delete", path: body.path }],
      readDocument: async (path) =>
        (await fetchRepositoryMarkdownDocument(path))?.body ?? null,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("GitHub deletion target does not exist:")) {
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
