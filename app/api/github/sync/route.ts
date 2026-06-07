import { NextResponse } from "next/server";
import { indexMarkdownDocument, treeFromPaths } from "@/lib/content/indexer";
import { memoryDataAdapter } from "@/lib/db/memory";
import { createInstallationOctokit } from "@/lib/github/client";
import { getRuntimeSetting } from "@/lib/settings/runtime-settings";

export const dynamic = "force-dynamic";

export async function POST() {
  const owner = getRuntimeSetting("TIL_REPOSITORY_OWNER") ?? "DawnteaStudio";
  const repo = getRuntimeSetting("TIL_REPOSITORY_NAME") ?? "TIL";
  const octokit = await createInstallationOctokit();
  const repository = await octokit.request("GET /repos/{owner}/{repo}", { owner, repo });
  const branch = repository.data.default_branch;
  const ref = await octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const tree = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
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
    const file = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path,
      ref: branch,
    });
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
