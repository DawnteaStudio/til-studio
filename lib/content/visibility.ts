export const folderVisibilityStorageKey = "til-studio.visible-root-folders";

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
