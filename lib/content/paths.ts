import type { NotePathInput, TheoryPathInput } from "./types";

export function makeSlug(value: string): string {
  return value
    .replace(/@/g, "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, "-")
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
