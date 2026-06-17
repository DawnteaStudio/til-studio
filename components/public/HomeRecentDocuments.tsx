"use client";

import Link from "next/link";
import { classifyPath } from "@/lib/content/indexer";
import { filterPathsByVisibleRoots } from "@/lib/content/visibility";
import { useVisibleRootPaths } from "./useVisibleRootPaths";

interface HomeRecentDocumentsProps {
  paths: string[];
  initialVisibleRootPaths?: string[];
}

export function HomeRecentDocuments({ paths, initialVisibleRootPaths }: HomeRecentDocumentsProps) {
  const { visibleRootPaths } = useVisibleRootPaths(paths, initialVisibleRootPaths);
  const recentPaths = filterPathsByVisibleRoots(paths, visibleRootPaths)
    .filter((path) => classifyPath(path) !== "readme")
    .slice(0, 6);

  return (
    <section className="public-glass rounded-[2rem] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-white">최근 기록</p>
        <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[0.68rem] uppercase text-[#9cecff]">
          live feed
        </span>
      </div>
      <ol className="mt-5 space-y-3">
        {recentPaths.map((path, index) => (
          <li key={path} className={index % 2 ? "sm:pl-8" : "sm:pr-8"}>
            <Link
              href={`/docs/${path}`}
              className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[1.15rem] border border-white/10 bg-white/[0.06] px-3 py-3 transition hover:-translate-y-1 hover:border-[#5de7ff]/50 hover:bg-white/[0.1]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffd36a] font-mono text-xs font-black text-[#080b12]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 break-all font-mono text-xs leading-5 text-[#e9e2d3] group-hover:text-white">
                {path}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
