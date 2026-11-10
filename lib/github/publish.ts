import { createInstallationOctokit, type InstallationOctokit } from "./client";
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

export async function fetchPublishPreview(path: string) {
  const owner = getRuntimeSetting("TIL_REPOSITORY_OWNER") ?? "DawnteaStudio";
  const repo = getRuntimeSetting("TIL_REPOSITORY_NAME") ?? "TIL";
  const client = await createInstallationOctokit();
  const { data } = await client.request("GET /repos/{owner}/{repo}", { owner, repo });
  const branch = data.default_branch;
  const file = await readPublishFile(client, owner, repo, branch, path);
  return { owner, repo, branch, path, sha: file?.sha ?? null, content: file?.content ?? null };
}
