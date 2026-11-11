import { authorizeAdminRequest } from "@/lib/auth/access";
import { NextResponse } from "next/server";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await authorizeAdminRequest(request);
  if (denied) return denied;
  const { owner, repo, branch, paths, allPaths } =
    await fetchRepositoryMarkdownSnapshot();
  return NextResponse.json({ owner, repo, branch, paths, allPaths });
}
