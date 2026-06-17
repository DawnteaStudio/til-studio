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
  visibleRootPaths: string[];
  onDraftKindChange(kind: StudioDraftKind): void;
  onVisibleRootPathsChange(paths: string[]): void;
  onSelectPath(path: string): void;
  isLoading?: boolean;
}

export function FolderTree({
  tree,
  selectedPath,
  draftKind,
  visibleRootPaths,
  onDraftKindChange,
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

  return (
    <nav className="space-y-4 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5de7ff]">Workspace</p>
        <p className="mt-2 text-2xl font-semibold text-[#f3ecd8]">
          {draftKind === "theory" ? "Theory" : "Notes"}
        </p>
        <p className="mt-2 text-xs leading-5 text-[#9d957f]">
          레포 전체가 아니라 글이 들어갈 작업 단위만 고릅니다.
        </p>
      </div>

      <div className="studio-panel grid grid-cols-2 rounded-2xl p-1">
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
                  ? "bg-[#ff34ff] text-[#111827] shadow-[0_10px_24px_rgba(255,52,255,0.2)]"
                  : "text-[#d8d0bd] hover:bg-white/10",
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
        <section className="studio-panel rounded-3xl p-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5de7ff]">Area</p>
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
                    ? "bg-[#5de7ff] text-[#111827] shadow-[0_12px_28px_rgba(93,231,255,0.16)]"
                    : "text-[#d8d0bd] hover:bg-white/10",
                ].join(" ")}
              >
                {area.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedArea ? (
        <section className="studio-panel overflow-hidden rounded-3xl p-3 transition-all duration-300">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5de7ff]">Topic</p>
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
                    ? "bg-[#c7f05a] text-[#111827] shadow-[0_12px_28px_rgba(199,240,90,0.18)]"
                    : "text-[#d8d0bd] hover:bg-white/10",
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
                  ? "border-[#ff34ff] bg-white/10 text-[#f4efe4]"
                  : "border-white/20 text-[#d8d0bd] hover:border-[#ff34ff]",
              ].join(" ")}
            >
              새 토픽
            </button>
            {isCreatingTopic ? (
              <label className="grid gap-2 rounded-2xl bg-white/10 p-3 text-xs text-[#d8d0bd] transition-all duration-300">
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
                  className="studio-field h-10 rounded-xl bg-[#111827] px-3 text-sm text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#ff34ff]/25"
                />
              </label>
            ) : null}
          </div>
        </section>
      ) : null}

      {rootDirectories.length ? (
        <section className="studio-panel rounded-3xl p-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#5de7ff]">
            공개 표시 폴더
          </p>
          <div className="mt-3 space-y-1">
            {rootDirectories.map((node) => {
              const checked = visibleRootSet.has(node.path);
              const isLastVisible = checked && visibleRootPaths.length <= 1;
              return (
                <label
                  key={node.path}
                  className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-2 text-[#d8d0bd] transition hover:bg-white/10"
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
                    className="size-4 accent-[#ff34ff]"
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
