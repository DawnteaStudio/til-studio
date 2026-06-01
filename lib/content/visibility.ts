import type { ContentNode } from "./types";

export const folderVisibilityStorageKey = "til-studio.visible-root-folders";
export const folderVisibilityCookieName = "til-studio.visible-root-folders";

export function topLevelFolder(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "";
}

export function visibleRootFolders(paths: string[], selectedRoots: string[]): string[] {
  const roots = [...new Set(paths.map(topLevelFolder).filter(Boolean))].sort();
  if (!selectedRoots.length) return roots;
  return roots.filter((root) => selectedRoots.includes(root));
}

export function filterPathsByVisibleRoots(paths: string[], selectedRoots: string[]): string[] {
  if (!selectedRoots.length) return paths;
  return paths.filter((path) => selectedRoots.includes(topLevelFolder(path)));
}

export function filterTreeByVisibleRoots(tree: ContentNode, selectedRoots: string[]): ContentNode {
  if (!selectedRoots.length) return tree;
  const selectedRootSet = new Set(selectedRoots);

  return {
    ...tree,
    children: (tree.children ?? []).filter((node) => selectedRootSet.has(topLevelFolder(node.path))),
  };
}

export function parseVisibleRootFoldersValue(value: string | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
