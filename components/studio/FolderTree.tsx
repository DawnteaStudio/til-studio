"use client";

import { useMemo, useState } from "react";
import {
  buildStudioWorkspace,
  topicPathFromSelection,
  type StudioDraftKind,
} from "@/lib/content/studio-workspace";
import type { ContentNode } from "@/lib/content/types";

interface FolderTreeProps {
  tree: ContentNode;
  selectedPath: string;
  draftKind: StudioDraftKind;
  sourceName: string;
  visibleRootPaths: string[];
  onDraftKindChange(kind: StudioDraftKind): void;
  onSourceNameChange(source: string): void;
  onVisibleRootPathsChange(paths: string[]): void;
  onSelectPath(path: string): void;
  isLoading?: boolean;
}

export function FolderTree({
  tree,
  selectedPath,
  draftKind,
  sourceName,
  visibleRootPaths,
  onDraftKindChange,
  onSourceNameChange,
  onVisibleRootPathsChange,
  onSelectPath,
  isLoading = false,
}: FolderTreeProps) {
  const workspace = useMemo(() => buildStudioWorkspace(tree, visibleRootPaths), [tree, visibleRootPaths]);
  const rootDirectories = useMemo(
    () => (tree.children ?? []).filter((node) => node.type === "directory"),
    [tree],
  );
  const visibleRootSet = useMemo(() => new Set(visibleRootPaths), [visibleRootPaths]);
  const [selectedAreaPath, setSelectedAreaPath] = useState("");
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const selectedArea =
    workspace.areas.find((area) => area.path === selectedPath.split("/")[0]) ??
    workspace.areas.find((area) => area.path === selectedAreaPath) ??
    workspace.areas[0];
  const selectedTopic = selectedArea?.topics.find((topic) => topic.path === selectedPath);

  return (
    <nav className="space-y-4 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d9a7b]">Workspace</p>
        <p className="mt-2 text-2xl font-semibold text-[#f3ecd8]">
          {draftKind === "theory" ? "Theory" : "Notes"}
        </p>
        <p className="mt-2 text-xs leading-5 text-[#9d957f]">
          레포 전체가 아니라 글이 들어갈 작업 단위만 고릅니다.
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-2xl bg-[#171b14] p-1">
        {(["note", "theory"] as const).map((kind) => {
          const active = draftKind === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onDraftKindChange(kind)}
              className={[
                "rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300",
                active
                  ? "bg-[#d8c69a] text-[#1e2118] shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
                  : "text-[#d8d0bd] hover:bg-[#252a20]",
              ].join(" ")}
            >
              {kind === "note" ? "Notes" : "Theory"}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-2xl bg-[#2a2f22] px-3 py-3 text-[#d8d0bd]">
          <span className="size-4 animate-spin rounded-full border-2 border-[#d8c69a] border-t-transparent" />
          <span className="text-xs">저장소 구조를 불러오는 중</span>
        </div>
      ) : null}

      {workspace.areas.length ? (
        <section className="rounded-3xl bg-[#171b14] p-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8d9a7b]">Area</p>
          <div className="mt-3 grid gap-2">
            {workspace.areas.map((area) => (
              <button
                key={area.path}
                type="button"
                onClick={() => {
                  setSelectedAreaPath(area.path);
                  setIsCreatingTopic(false);
                  onSelectPath("");
                }}
                className={[
                  "rounded-2xl px-3 py-2 text-left font-medium transition-all duration-300",
                  selectedArea?.path === area.path
                    ? "bg-[#d8c69a] text-[#1e2118] shadow-[0_12px_28px_rgba(0,0,0,0.2)]"
                    : "text-[#d8d0bd] hover:bg-[#24291d]",
                ].join(" ")}
              >
                {area.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedArea ? (
        <section className="overflow-hidden rounded-3xl bg-[#171b14] p-3 transition-all duration-300">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8d9a7b]">Topic</p>
          <div className="mt-3 grid gap-2">
            {selectedArea.topics.map((topic) => (
              <button
                key={topic.path}
                type="button"
                onClick={() => {
                  setIsCreatingTopic(false);
                  onSelectPath(topic.path);
                }}
                className={[
                  "rounded-2xl px-3 py-2 text-left transition-all duration-300",
                  selectedPath === topic.path && !isCreatingTopic
                    ? "bg-[#d8c69a] text-[#1e2118] shadow-[0_12px_28px_rgba(0,0,0,0.2)]"
                    : "text-[#d8d0bd] hover:bg-[#24291d]",
                ].join(" ")}
              >
                <span className="block font-medium">{topic.name}</span>
                {draftKind === "note" ? (
                  <span className="mt-1 block text-xs opacity-70">{topic.sources.length} sources</span>
                ) : null}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsCreatingTopic(true);
                onSelectPath("");
              }}
              className={[
                "rounded-2xl border border-dashed px-3 py-2 text-left font-medium transition-all duration-300",
                isCreatingTopic
                  ? "border-[#d8c69a] bg-[#2b2f24] text-[#f4efe4]"
                  : "border-[#3a3f31] text-[#d8d0bd] hover:border-[#d8c69a]",
              ].join(" ")}
            >
              새 토픽
            </button>
            {isCreatingTopic ? (
              <label className="grid gap-2 rounded-2xl bg-[#24291d] p-3 text-xs text-[#d8d0bd] transition-all duration-300">
                <span className="font-semibold">새 토픽 이름</span>
                <input
                  onChange={(event) =>
                    onSelectPath(
                      topicPathFromSelection({
                        area: selectedArea.path,
                        existingTopicPath: "",
                        newTopicName: event.target.value,
                      }),
                    )
                  }
                  className="h-10 rounded-xl bg-[#34382b] px-3 text-sm text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#d8c69a]/25"
                />
              </label>
            ) : null}
          </div>
        </section>
      ) : null}

      {draftKind === "note" && selectedArea ? (
        <section className="overflow-hidden rounded-3xl bg-[#171b14] p-3 transition-all duration-300">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8d9a7b]">Source</p>
          <div className="mt-3 grid gap-2">
            {selectedTopic?.sources.map((source) => (
              <button
                key={source.path}
                type="button"
                onClick={() => onSourceNameChange(source.name)}
                className={[
                  "rounded-2xl px-3 py-2 text-left transition-all duration-300",
                  sourceName === source.name
                    ? "bg-[#d8c69a] text-[#1e2118] shadow-[0_12px_28px_rgba(0,0,0,0.2)]"
                    : "text-[#d8d0bd] hover:bg-[#24291d]",
                ].join(" ")}
              >
                {source.name}
              </button>
            ))}
            <label className="grid gap-2 rounded-2xl bg-[#24291d] p-3 text-xs text-[#d8d0bd]">
              <span className="font-semibold">새 자료 폴더</span>
              <input
                value={sourceName}
                onChange={(event) => onSourceNameChange(event.target.value)}
                className="h-10 rounded-xl bg-[#34382b] px-3 text-sm text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#d8c69a]/25"
              />
            </label>
          </div>
        </section>
      ) : null}

      {rootDirectories.length ? (
        <section className="rounded-3xl bg-[#171b14] p-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8d9a7b]">
            공개 표시 폴더
          </p>
          <div className="mt-3 space-y-1">
            {rootDirectories.map((node) => {
              const checked = visibleRootSet.has(node.path);
              const isLastVisible = checked && visibleRootPaths.length <= 1;
              return (
                <label
                  key={node.path}
                  className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-2 text-[#d8d0bd] hover:bg-[#24291d]"
                >
                  <span>{node.name}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isLastVisible}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...visibleRootPaths, node.path]
                        : visibleRootPaths.filter((path) => path !== node.path);
                      onVisibleRootPathsChange(next);
                    }}
                    className="size-4 accent-[#d8c69a]"
                  />
                </label>
              );
            })}
          </div>
        </section>
      ) : null}
    </nav>
  );
}
