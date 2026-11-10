import { indexArchive, type ArchiveFile } from "@/lib/content/archive-index";
import { classifyPath } from "@/lib/content/indexer";
import { createInstallationOctokit, type InstallationOctokit } from "./client";
import { fetchRepositoryMarkdownSnapshot, type RepositoryMarkdownSnapshot } from "./repository";

type BatchResult = {
  repository: Record<string, { text: string | null; isTruncated: boolean } | null> & {
    tip: Record<string, { nodes: { committedDate: string }[] }>;
  };
};

async function loadBatch(
  client: InstallationOctokit,
  snapshot: RepositoryMarkdownSnapshot,
  paths: string[],
): Promise<ArchiveFile[]> {
  const { owner, repo, headSha } = snapshot;
  const variables: Record<string, string> = { owner, repo, head: headSha };
  const declarations = ["$owner: String!", "$repo: String!", "$head: GitObjectID!"];
  const blobs: string[] = [];
  const histories: string[] = [];
  paths.forEach((path, i) => {
    declarations.push(`$file${i}: String!`, `$path${i}: String!`);
    variables[`file${i}`] = `${headSha}:${path}`;
    variables[`path${i}`] = path;
    blobs.push(`f${i}: object(expression: $file${i}) { ... on Blob { text isTruncated } }`);
    histories.push(`h${i}: history(path: $path${i}, first: 1) { nodes { committedDate } }`);
  });
  const result = await client.graphql<BatchResult>(`
    query Archive(${declarations.join(", ")}) {
      repository(owner: $owner, name: $repo) {
        ${blobs.join("\n")}
        tip: object(oid: $head) { ... on Commit { ${histories.join("\n")} } }
      }
    }`, variables);
  return Promise.all(paths.map(async (path, i) => {
    const blob = result.repository[`f${i}`];
    let body = blob?.text;
    if (typeof body !== "string" || blob?.isTruncated) {
      const raw = await client.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner, repo, path, ref: headSha, mediaType: { format: "raw" },
      });
      if (typeof raw.data !== "string") throw new Error(`Could not read Markdown at ${path}`);
      body = raw.data;
    }
    return { path, body, updated: result.repository.tip[`h${i}`]?.nodes[0]?.committedDate ?? null };
  }));
}

async function loadIndex(client: InstallationOctokit, snapshot: RepositoryMarkdownSnapshot) {
  const paths = snapshot.paths.filter((path) => ["note", "theory"].includes(classifyPath(path)));
  const files: ArchiveFile[] = [];
  // GitHub can resolve many paths and their histories in one request without fetching every file individually.
  const batchSize = 20;
  for (let start = 0; start < paths.length; start += batchSize) {
    files.push(...await loadBatch(client, snapshot, paths.slice(start, start + batchSize)));
  }
  return indexArchive(files, snapshot.allPaths);
}

let cached: { key: string; index: ReturnType<typeof loadIndex> } | undefined;

export async function fetchRepositoryArchive() {
  const client = await createInstallationOctokit();
  const snapshot = await fetchRepositoryMarkdownSnapshot(client);
  const key = [snapshot.owner, snapshot.repo, snapshot.branch, snapshot.headSha].join("/");
  if (cached?.key !== key) {
    const index = loadIndex(client, snapshot);
    cached = { key, index };
    // A temporary GitHub failure should be retried on the next visit.
    index.catch(() => { if (cached?.index === index) cached = undefined; });
  }
  return { ...snapshot, ...await cached.index };
}
