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

export function sourceNamesAtTopic(paths: string[], topic: string): string[] {
  const names = new Set<string>();
  const prefix = topic + "/notes/";
  for (const path of paths) {
    if (!path.startsWith(prefix)) continue;
    const [name, child] = path.slice(prefix.length).split("/");
    if (name && child) names.add(name);
  }
  return [...names].sort();
}

export function matchingSourceNames(names: string[], rawName: string): string[] {
  const name = rawName.trim();
  if (names.includes(name)) return [name];
  const slug = makeSlug(name);
  if (!slug) return [];
  if (names.includes(slug)) return [slug];
  return names.filter((entry) => makeSlug(entry) === slug);
}

export function existingSourceConflict(paths: string[], topic: string, rawName: string) {
  const matches = matchingSourceNames(sourceNamesAtTopic(paths, topic), rawName);
  if (!matches.length) return null;
  const folders = new Set(matches);
  const prefix = topic + "/notes/";
  return {
    error: "source_exists" as const,
    sourceName: matches.length === 1 ? matches[0] : null,
    sourcePaths: paths.filter((path) => path.startsWith(prefix) && folders.has(path.slice(prefix.length).split("/")[0])),
  };
}

export function sourcePracticeSlugs(paths: string[], sourcePath: string): string[] {
  const prefix = sourcePath + "/src/";
  const slugs = new Set<string>();
  for (const path of paths) {
    if (!path.startsWith(prefix)) continue;
    const [slug, file] = path.slice(prefix.length).split("/");
    if (slug && !slug.startsWith(".") && file && !path.endsWith("/.gitkeep")) slugs.add(slug);
  }
  return [...slugs].sort();
}

export function buildNotePath(input: NotePathInput): string {
  return [
    input.area,
    input.topic,
    "notes",
    input.existingSourceName ?? makeSlug(input.source),
    "note",
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

  if (segments[kindIndex] === "notes" && segments[kindIndex + 2] === "note") {
    return "../README.md";
  }

  const depthBelowKind = segments.length - kindIndex - 2;
  return `${"../".repeat(Math.max(depthBelowKind, 1))}README.md`;
}
