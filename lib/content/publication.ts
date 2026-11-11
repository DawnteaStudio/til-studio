import { isHostedMode } from "@/lib/auth/mode";
import { topLevelFolder, visibleRootFolders } from "./visibility";

export function publishedRoots(): string[] | null {
  if (!isHostedMode()) return null;
  try {
    const value: unknown = JSON.parse(process.env.TIL_PUBLIC_ROOTS ?? "[]");
    if (!Array.isArray(value) || value.some((root) =>
      typeof root !== "string" || !root.trim() || root !== root.trim() || /[/\\\\]/.test(root) || root === "." || root === "..")) return [];
    return [...new Set(value as string[])];
  } catch {
    return [];
  }
}

export function isPublishedPath(path: string): boolean {
  if (path.includes("\\") || path.split("/").some((part) => part === "." || part === "..")) return false;
  const roots = publishedRoots();
  return roots === null || roots.includes(topLevelFolder(path));
}

export function publicVisibleRoots(paths: string[], selectedRoots: string[]): string[] {
  const roots = publishedRoots();
  const allowed = roots === null ? paths : paths.filter((path) => roots.includes(topLevelFolder(path)));
  return visibleRootFolders(allowed, selectedRoots);
}
