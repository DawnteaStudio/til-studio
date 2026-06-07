import { indexMarkdownDocument, treeFromPaths } from "@/lib/content/indexer";
import { documentPathCandidates } from "@/lib/content/document-path";
import type { ContentNode } from "@/lib/content/types";
import { getRuntimeSetting } from "@/lib/settings/runtime-settings";
import { createInstallationOctokit } from "./client";

export interface RepositoryMarkdownSnapshot {
  owner: string;
  repo: string;
  branch: string;
  paths: string[];
  tree: ContentNode;
}

export async function fetchRepositoryMarkdownSnapshot(): Promise<RepositoryMarkdownSnapshot> {
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
  const gitTree = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
    owner,
    repo,
    tree_sha: ref.data.object.sha,
    recursive: "true",
  });

  const paths = gitTree.data.tree
    .filter((item) => item.type === "blob" && item.path?.endsWith(".md"))
    .map((item) => item.path)
    .filter((path): path is string => Boolean(path))
    .filter(shouldIndexMarkdownPath);

  return {
    owner,
    repo,
    branch,
    paths,
    tree: treeFromPaths(paths),
  };
}

export async function fetchRepositoryMarkdownDocument(path: string) {
  const owner = getRuntimeSetting("TIL_REPOSITORY_OWNER") ?? "DawnteaStudio";
  const repo = getRuntimeSetting("TIL_REPOSITORY_NAME") ?? "TIL";
  const octokit = await createInstallationOctokit();

  const repository = await octokit.request("GET /repos/{owner}/{repo}", { owner, repo });
  const branch = repository.data.default_branch;
  const file = await octokit
    .request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path,
      ref: branch,
    })
    .catch(() => null);

  if (!file) return null;

  if (Array.isArray(file.data) || file.data.type !== "file" || !file.data.content) {
    return null;
  }

  const body = Buffer.from(file.data.content, "base64").toString("utf8");
  return { ...indexMarkdownDocument({ path, body }), owner, repo, branch };
}

export async function resolveRepositoryMarkdownDocument(path: string) {
  for (const candidate of documentPathCandidates(path)) {
    const document = await fetchRepositoryMarkdownDocument(candidate);
    if (document) return document;
  }

  return null;
}

export function shouldIndexMarkdownPath(path: string): boolean {
  return path.endsWith(".md") && !path.startsWith("templates/");
}
