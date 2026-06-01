"use client";

import Link from "next/link";
import { filterPathsByVisibleRoots } from "@/lib/content/visibility";
import { useVisibleRootPaths } from "./useVisibleRootPaths";

interface HomeRecentDocumentsProps {
  paths: string[];
  initialVisibleRootPaths?: string[];
}

export function HomeRecentDocuments({ paths, initialVisibleRootPaths }: HomeRecentDocumentsProps) {
  const { visibleRootPaths } = useVisibleRootPaths(paths, initialVisibleRootPaths);
  const recentPaths = filterPathsByVisibleRoots(paths, visibleRootPaths).slice(0, 6);

  return (
    <div className="mt-6 space-y-3">
      {recentPaths.map((path) => (
        <Link
          key={path}
          href={`/docs/${path}`}
          className="block rounded-2xl bg-[#303629] px-4 py-3 font-mono text-xs text-[#d8d0bd] transition hover:bg-[#3a422f]"
        >
          {path}
        </Link>
      ))}
    </div>
  );
}
