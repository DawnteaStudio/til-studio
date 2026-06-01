import { treeFromPaths } from "@/lib/content/indexer";
import type { ContentNode } from "@/lib/content/types";
import { createInstallationOctokit } from "./client";

export interface RepositoryMarkdownSnapshot {
  owner: string;
  repo: string;
  branch: string;
  paths: string[];
  tree: ContentNode;
}

export async function fetchRepositoryMarkdownSnapshot(): Promise<RepositoryMarkdownSnapshot> {
  const owner = process.env.TIL_REPOSITORY_OWNER ?? "DawnteaStudio";
  const repo = process.env.TIL_REPOSITORY_NAME ?? "TIL";
  const octokit = await createInstallationOctokit();

  const repository = await octokit.request("GET /repos/{owner}/{repo}", { owner, repo });
  const branch = repository.data.default_branch;
  const ref = await octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const gitTree = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
    owner,
    repo,
    tree_sha: ref.data.object.sha,
    recursive: "true",
  });

  const paths = gitTree.data.tree
    .filter((item) => item.type === "blob" && item.path?.endsWith(".md"))
    .map((item) => item.path)
    .filter((path): path is string => Boolean(path));

  return {
    owner,
    repo,
    branch,
    paths,
    tree: treeFromPaths(paths),
  };
}
