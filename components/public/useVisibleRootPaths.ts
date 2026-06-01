"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  folderVisibilityStorageKey,
  parseVisibleRootFoldersValue,
  topLevelFolder,
} from "@/lib/content/visibility";

export function useVisibleRootPaths(paths: string[], initialVisibleRootPaths?: string[]) {
  const rootFolders = useMemo(
    () => [...new Set(paths.map(topLevelFolder).filter(Boolean))].sort(),
    [paths],
  );
  const initialRoots = useMemo(
    () => normalizeInitialRoots(rootFolders, initialVisibleRootPaths),
    [initialVisibleRootPaths, rootFolders],
  );
  const fallbackValue = useMemo(() => JSON.stringify(initialRoots), [initialRoots]);
  const savedValue = useSyncExternalStore(
    subscribeVisibleRootPaths,
    readVisibleRootPathsValue,
    () => fallbackValue,
  );
  const savedRoots = parseVisibleRootFoldersValue(savedValue);
  const visibleRootPaths = savedRoots.length ? normalizeInitialRoots(rootFolders, savedRoots) : initialRoots;

  return {
    rootFolders,
    visibleRootPaths,
  };
}

function normalizeInitialRoots(rootFolders: string[], initialVisibleRootPaths: string[] | undefined): string[] {
  if (!initialVisibleRootPaths?.length) return rootFolders;
  return rootFolders.filter((root) => initialVisibleRootPaths.includes(root));
}

function subscribeVisibleRootPaths(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function readVisibleRootPathsValue(): string {
  return window.localStorage.getItem(folderVisibilityStorageKey) ?? "[]";
}
