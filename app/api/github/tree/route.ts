import { NextResponse } from "next/server";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const { owner, repo, branch, paths } = await fetchRepositoryMarkdownSnapshot();
  return NextResponse.json({ owner, repo, branch, paths });
}
