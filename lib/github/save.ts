import { createInstallationOctokit } from "./client";
import { readmePathForContentPath, topicPathForReadme, upsertTopicReadmeIndex } from "@/lib/content/topic-readme";
import type { SaveMode } from "@/lib/content/types";
import type { FileChange, SaveRequest, SaveResult } from "./types";

export function recommendSaveMode(paths: string[]): SaveMode {
  const requiresReview = paths.some((path) => {
    if (path.includes("/theory/")) return true;
    if (path.endsWith("README.md")) return true;
    if (!path.endsWith(".md")) return true;
    return false;
  });

  return requiresReview ? "review" : "quick";
}

export function buildTopicReadmeChanges(input: {
  existingPaths: string[];
  incomingChanges: FileChange[];
  existingReadmes: Record<string, string | null | undefined>;
}): FileChange[] {
  const incomingMarkdownPaths = input.incomingChanges
    .map((change) => change.path)
    .filter((path) => path.endsWith(".md"));
  const readmePaths = [...new Set(incomingMarkdownPaths.map(readmePathForContentPath).filter(Boolean))];
  const nextPaths = [...new Set([...input.existingPaths, ...incomingMarkdownPaths])];

  return readmePaths
    .filter((path): path is string => typeof path === "string")
    .map((readmePath) => ({
      path: readmePath,
      content: upsertTopicReadmeIndex({
        topicPath: topicPathForReadme(readmePath),
        existingContent: input.existingReadmes[readmePath],
        documentPaths: nextPaths,
      }),
    }));
}

function branchName(): string {
  return `til-studio/${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

export async function saveToGitHub(request: SaveRequest): Promise<SaveResult> {
  const octokit = await createInstallationOctokit();
  const { owner, repo, defaultBranch } = request.repository;
  const targetBranch = request.mode === "quick" ? defaultBranch : branchName();
  const baseRef = await octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = baseRef.data.object.sha;

  if (request.mode === "review") {
    await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
      owner,
      repo,
      ref: `refs/heads/${targetBranch}`,
      sha: baseSha,
    });
  }

  let latestCommitSha = baseSha;

  for (const change of request.changes) {
    let existingSha: string | undefined;
    try {
      const existing = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo,
        path: change.path,
        ref: targetBranch,
      });
      if (!Array.isArray(existing.data) && existing.data.type === "file") {
        existingSha = existing.data.sha;
      }
    } catch {
      existingSha = undefined;
    }

    const updated = await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      branch: targetBranch,
      path: change.path,
      message: request.message,
      content: Buffer.from(change.content, "utf8").toString("base64"),
      sha: existingSha,
    });

    latestCommitSha = updated.data.commit.sha ?? latestCommitSha;
  }

  if (request.mode === "review") {
    const pr = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
      owner,
      repo,
      head: targetBranch,
      base: defaultBranch,
      title: request.message,
      body: "Created by til-studio.",
      draft: true,
    });

    return {
      mode: request.mode,
      branch: targetBranch,
      commitSha: latestCommitSha,
      pullRequestUrl: pr.data.html_url,
    };
  }

  return {
    mode: request.mode,
    branch: targetBranch,
    commitSha: latestCommitSha,
  };
}
