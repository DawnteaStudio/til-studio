import type { NotePathInput, TheoryPathInput } from "./types";

const romanized: Record<string, string> = {
  "트랜잭션": "transaction",
  "롤백": "rollback",
  "기준": "",
  "기본": "",
};

export function makeSlug(value: string): string {
  const replaced = value
    .replace(/@/g, "")
    .replace(/Transactional/g, "transactional")
    .replace(/BFS/gi, "bfs")
    .replace(/DFS/gi, "dfs")
    .split(/\s+/)
    .map((part) => romanized[part] ?? part)
    .filter(Boolean)
    .join("-");

  return replaced
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "-")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildNotePath(input: NotePathInput): string {
  return [
    input.area,
    input.topic,
    "notes",
    makeSlug(input.source),
    `${makeSlug(input.title)}.md`,
  ].join("/");
}

export function buildTheoryPath(input: TheoryPathInput): string {
  return [input.area, input.topic, "theory", `${makeSlug(input.title)}.md`].join("/");
}

export function parentReadmePath(path: string): string {
  const segments = path.split("/");
  const kindIndex = segments.findIndex((segment) => segment === "notes" || segment === "theory");
  if (kindIndex === -1) {
    return "./README.md";
  }

  const depthBelowKind = segments.length - kindIndex - 2;
  return `${"../".repeat(Math.max(depthBelowKind, 1))}README.md`;
}
