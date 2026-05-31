import { NextResponse } from "next/server";
import { createInstallationOctokit } from "@/lib/github/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = process.env.TIL_REPOSITORY_OWNER ?? "DawnteaStudio";
  const repo = process.env.TIL_REPOSITORY_NAME ?? "TIL";
  const octokit = await createInstallationOctokit();

  const repository = await octokit.repos.get({ owner, repo });
  const branch = repository.data.default_branch;
  const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const tree = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: ref.data.object.sha,
    recursive: "true",
  });

  const paths = tree.data.tree
    .filter((item) => item.type === "blob" && item.path?.endsWith(".md"))
    .map((item) => item.path)
    .filter((path): path is string => Boolean(path));

  return NextResponse.json({ owner, repo, branch, paths });
}
