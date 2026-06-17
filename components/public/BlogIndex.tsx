"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { classifyPath } from "@/lib/content/indexer";
import { buildFolderNav, filterPathsByFolder, type FolderNavNode } from "@/lib/content/folder-tree";
import type { ContentKind } from "@/lib/content/types";
import { filterPathsByVisibleRoots } from "@/lib/content/visibility";
import { useVisibleRootPaths } from "./useVisibleRootPaths";

interface BlogIndexProps {
  paths: string[];
  owner: string;
  repo: string;
  initialVisibleRootPaths?: string[];
}

interface BlogDocument {
  path: string;
  title: string;
  kind: ContentKind;
  area: string;
  topic: string;
}

const kindLabel: Record<ContentKind, string> = {
  note: "note",
  theory: "theory",
  readme: "guide",
  other: "doc",
};

export function BlogIndex({ paths, owner, repo, initialVisibleRootPaths }: BlogIndexProps) {
  const { visibleRootPaths } = useVisibleRootPaths(paths, initialVisibleRootPaths);
  const contentPaths = useMemo(
    () =>
      filterPathsByVisibleRoots(paths, visibleRootPaths).filter((path) => {
        const kind = classifyPath(path);
        return kind === "note" || kind === "theory";
      }),
    [paths, visibleRootPaths],
  );
  const [activeFolder, setActiveFolder] = useState("all");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const folderTree = useMemo(() => buildFolderNav(contentPaths), [contentPaths]);
  const selectedPaths = filterPathsByFolder(contentPaths, activeFolder);
  const documents = selectedPaths.map(toBlogDocument);
  const notes = documents.filter((doc) => doc.kind === "note");
  const theory = documents.filter((doc) => doc.kind === "theory");

  function toggleFolder(path: string) {
    setActiveFolder(path);
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <main className="public-shell text-[#f7f4ea]">
      <section className="public-frame py-6 sm:py-8">
        <nav className="public-nav rounded-full px-4 py-3 sm:px-5">
          <Link href="/" className="text-base font-semibold sm:text-lg">til-studio</Link>
          <div className="flex gap-2 text-sm text-[#d6d0c6]">
            <Link href="/map" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Map</Link>
            <Link href="/studio" className="rounded-full bg-white/10 px-3 py-2 transition hover:bg-[#ffd36a] hover:text-[#080b12]">
              Studio
            </Link>
          </div>
        </nav>

        <header className="relative mt-12 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
          <div className="absolute inset-x-0 top-0 h-1 public-step-line" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase text-[#c7f05a]">{owner}/{repo}</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.95] tracking-normal text-white sm:text-7xl">
                archive stream
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#d8d0bd]">
                notes와 theory만 골라 읽는 공개 아카이브입니다. 폴더 필터는 유지하되,
                글 자체가 먼저 눈에 들어오도록 스트림 중심으로 재구성했습니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="all" value={documents.length} />
              <Metric label="notes" value={notes.length} />
              <Metric label="theory" value={theory.length} />
            </div>
          </div>
        </header>

        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="relative space-y-5">
            <div className="absolute bottom-0 left-4 top-0 hidden w-px bg-gradient-to-b from-[#5de7ff] via-white/15 to-[#ffd36a] md:block" />
            {documents.map((document, index) => (
              <Link
                key={document.path}
                href={`/docs/${document.path}`}
                className={[
                  "public-stream-card group block rounded-[1.5rem] p-5 md:ml-10 md:p-6",
                  index % 2 ? "xl:ml-24 xl:mr-0" : "xl:mr-16",
                ].join(" ")}
              >
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-[#ffd36a] px-3 py-1 text-xs font-black text-[#080b12]">
                    {kindLabel[document.kind]}
                  </span>
                  <span className="font-mono text-xs text-[#9cecff]">
                    {String(index + 1).padStart(2, "0")} / {document.area}/{document.topic}
                  </span>
                </div>
                <h2 className="relative z-10 mt-6 text-2xl font-black leading-tight text-white group-hover:text-[#ffd36a] sm:text-3xl">
                  {document.title}
                </h2>
                <p className="relative z-10 mt-4 break-all font-mono text-xs leading-5 text-[#bfb8aa]">
                  {document.path}
                </p>
              </Link>
            ))}
          </section>

          <aside className="public-glass rounded-[2rem] p-4 xl:sticky xl:top-6 xl:self-start">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm font-bold text-white">탐색 필터</p>
              <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[0.68rem] text-[#9cecff]">
                {documents.length} files
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveFolder("all")}
              className={[
                "mb-3 flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm font-bold transition",
                activeFolder === "all"
                  ? "bg-[#ffd36a] text-[#080b12]"
                  : "bg-white/[0.07] text-white hover:bg-white/[0.12]",
              ].join(" ")}
            >
              <span>전체 글</span>
              <span>{contentPaths.length}</span>
            </button>
            <div className="space-y-1">
              {folderTree.map((folder) => (
                <FolderButton
                  key={folder.path}
                  activeFolder={activeFolder}
                  expandedFolders={expandedFolders}
                  folder={folder}
                  level={0}
                  onToggle={toggleFolder}
                />
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function FolderButton({
  activeFolder,
  expandedFolders,
  folder,
  level,
  onToggle,
}: {
  activeFolder: string;
  expandedFolders: Set<string>;
  folder: FolderNavNode;
  level: number;
  onToggle(path: string): void;
}) {
  const isExpanded = expandedFolders.has(folder.path);
  const isActive = activeFolder === folder.path;
  const hasChildren = folder.children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(folder.path)}
        className={[
          "flex w-full items-center justify-between gap-3 rounded-full px-3 py-2.5 text-left text-sm transition",
          isActive ? "bg-[#ffd36a] text-[#080b12]" : "text-[#d8d0bd] hover:bg-white/[0.08] hover:text-white",
        ].join(" ")}
        style={{ paddingLeft: `${12 + level * 18}px` }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
            {hasChildren ? "›" : "·"}
          </span>
          <span className="truncate font-medium">{folder.name}</span>
        </span>
        <span className="shrink-0 text-xs opacity-70">{folder.documentCount}</span>
      </button>
      {hasChildren ? (
        <div
          className={[
            "grid overflow-hidden transition-all duration-300 ease-out",
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          ].join(" ")}
        >
          <div className="min-h-0 space-y-1 py-1">
            {folder.children.map((child) => (
              <FolderButton
                key={child.path}
                activeFolder={activeFolder}
                expandedFolders={expandedFolders}
                folder={child}
                level={level + 1}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-[#080b12]/45 p-4 text-center backdrop-blur">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs uppercase text-[#c8c0b1]">{label}</p>
    </div>
  );
}

function toBlogDocument(path: string): BlogDocument {
  const segments = path.split("/");
  return {
    path,
    title: path.split("/").at(-1)?.replace(/\.md$/, "") ?? path,
    kind: classifyPath(path),
    area: segments[0] ?? "root",
    topic: segments[1] ?? "root",
  };
}
