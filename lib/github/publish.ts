import { createInstallationOctokit, type InstallationOctokit } from "./client";
import type { RepositoryMarkdownSnapshot } from "./repository";
import { getRuntimeSetting } from "@/lib/settings/runtime-settings";

export class PublishConflict extends Error {}

export function isPublishPath(path: string) {
  return path.endsWith(".md") && path.split("/").every(
    (part) => part.length > 0 && part !== "." && part !== ".." && !part.includes("\\"),
  );
}

export async function readPublishFile(
  client: InstallationOctokit,
  owner: string,
  repo: string,
  ref: string,
  path: string,
) {
  try {
    const { data } = await client.request("GET /repos/{owner}/{repo}/contents/{path}", { owner, repo, ref, path });
    if (Array.isArray(data) || data.type !== "file" || data.encoding !== "base64") {
      throw new Error("Unsupported GitHub file");
    }
    return { sha: data.sha, content: Buffer.from(data.content, "base64").toString("utf8") };
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 404) return null;
    throw error;
  }
}

export function snapshotFileReader(snapshot: RepositoryMarkdownSnapshot, existingClient?: InstallationOctokit) {
  const paths = new Set(snapshot.allPaths);
  let client = existingClient ? Promise.resolve(existingClient) : undefined;
  return async (path: string) => {
    if (!paths.has(path)) return null;
    client ??= createInstallationOctokit();
    const file = await readPublishFile(await client, snapshot.owner, snapshot.repo, snapshot.headSha, path);
    if (!file) throw new Error("Cannot read an indexed GitHub file");
    return file;
  };
}

export async function fetchPublishPreview(path: string) {
  const owner = getRuntimeSetting("TIL_REPOSITORY_OWNER") ?? "DawnteaStudio";
  const repo = getRuntimeSetting("TIL_REPOSITORY_NAME") ?? "TIL";
  const client = await createInstallationOctokit();
  const { data } = await client.request("GET /repos/{owner}/{repo}", { owner, repo });
  const branch = data.default_branch;
  const file = await readPublishFile(client, owner, repo, branch, path);
  return { owner, repo, branch, path, sha: file?.sha ?? null, content: file?.content ?? null };
}
