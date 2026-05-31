import { NextResponse } from "next/server";
import { indexMarkdownDocument, treeFromPaths } from "@/lib/content/indexer";
import { memoryDataAdapter } from "@/lib/db/memory";
import { createInstallationOctokit } from "@/lib/github/client";

export const dynamic = "force-dynamic";

export async function POST() {
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

  const documents = [];
  for (const path of paths) {
    const file = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (!Array.isArray(file.data) && file.data.type === "file" && file.data.content) {
      const body = Buffer.from(file.data.content, "base64").toString("utf8");
      documents.push(indexMarkdownDocument({ path, body }));
    }
  }

  const index = {
    syncedAt: new Date().toISOString(),
    tree: treeFromPaths(paths),
    documents,
  };

  await memoryDataAdapter.setContentIndex(index);

  return NextResponse.json({
    syncedAt: index.syncedAt,
    documentCount: documents.length,
  });
}
