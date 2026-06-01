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
    <main className="min-h-screen bg-[#151611] text-[#f4efe4]">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <nav className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold">til-studio</Link>
          <div className="flex gap-3 text-sm text-[#cec4ae]">
            <Link href="/map" className="hover:text-[#f4efe4]">Map</Link>
            <Link href="/studio" className="hover:text-[#f4efe4]">Studio</Link>
          </div>
        </nav>

        <header className="grid gap-8 border-b border-[#34382b] pb-10 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9da88c]">
              {owner}/{repo}
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight text-[#f4efe4]">
              공부 기록을 블로그처럼 읽는 공간
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#c8bea8]">
              TIL 저장소의 notes와 theory를 실제 글 목록으로 보여줍니다. 안내 문서는 폴더 진입용으로만 쓰고,
              화면에서는 폴더를 펼쳐가며 학습 기록을 고를 수 있게 구성합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 self-end">
            <Metric label="all" value={documents.length} />
            <Metric label="notes" value={notes.length} />
            <Metric label="theory" value={theory.length} />
          </div>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[1.75rem] bg-[#20241b] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <button
              type="button"
              onClick={() => setActiveFolder("all")}
              className={[
                "mb-3 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                activeFolder === "all"
                  ? "bg-[#d8c69a] text-[#151611]"
                  : "bg-[#2a3024] text-[#f4efe4] hover:bg-[#343c2c]",
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

          <section className="grid content-start gap-5 xl:grid-cols-2">
            {documents.map((document) => (
              <Link
                key={document.path}
                href={`/docs/${document.path}`}
                className="group rounded-[1.75rem] bg-[#24281e] p-5 transition hover:-translate-y-0.5 hover:bg-[#2f3527]"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full bg-[#d8c69a] px-3 py-1 text-xs font-semibold text-[#1e2118]">
                    {kindLabel[document.kind]}
                  </span>
                  <span className="font-mono text-xs text-[#9d957f]">
                    {document.area}/{document.topic}
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-[#f4efe4] group-hover:text-[#f3d99a]">
                  {document.title}
                </h2>
                <p className="mt-3 break-all font-mono text-xs leading-5 text-[#9d957f]">
                  {document.path}
                </p>
              </Link>
            ))}
          </section>
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
          "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition",
          isActive ? "bg-[#d8c69a] text-[#151611]" : "text-[#cec4ae] hover:bg-[#2a3024] hover:text-[#f4efe4]",
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
    <div className="rounded-3xl bg-[#24281e] p-4 text-center">
      <p className="text-2xl font-semibold text-[#f4efe4]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9d957f]">{label}</p>
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
