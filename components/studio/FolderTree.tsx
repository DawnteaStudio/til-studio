"use client";

import { useMemo, useState } from "react";
import type { ContentNode } from "@/lib/content/types";

interface FolderTreeProps {
  tree: ContentNode;
  selectedPath: string;
  onSelectPath(path: string): void;
}

export function FolderTree({ tree, selectedPath, onSelectPath }: FolderTreeProps) {
  const rootDirectories = useMemo(
    () => (tree.children ?? []).filter((node) => node.type === "directory"),
    [tree],
  );
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  function toggle(path: string) {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <nav className="space-y-4 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d9a7b]">Repository</p>
        <p className="mt-2 text-2xl font-semibold text-[#f3ecd8]">{tree.name}</p>
        <p className="mt-2 text-xs leading-5 text-[#9d957f]">
          폴더를 펼쳐서 작성 위치를 선택하세요. 파일은 글 목록에서 따로 봅니다.
        </p>
      </div>
      <div className="space-y-1.5">
        {rootDirectories.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onToggle={toggle}
            onSelectPath={onSelectPath}
          />
        ))}
      </div>
    </nav>
  );
}

function TreeNode({
  node,
  selectedPath,
  expandedPaths,
  onToggle,
  onSelectPath,
  depth = 0,
}: {
  node: ContentNode;
  selectedPath: string;
  expandedPaths: Set<string>;
  onToggle(path: string): void;
  onSelectPath(path: string): void;
  depth?: number;
}) {
  const childDirectories = (node.children ?? []).filter((child) => child.type === "directory");
  const isSelected = selectedPath === node.path;
  const isExpanded = expandedPaths.has(node.path);

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          className={[
            "grid size-7 shrink-0 place-items-center rounded-full text-xs transition",
            childDirectories.length ? "text-[#d8d0bd] hover:bg-[#2a2f22]" : "text-[#5c6250]",
          ].join(" ")}
          disabled={!childDirectories.length}
          aria-label={isExpanded ? `${node.name} 접기` : `${node.name} 펼치기`}
        >
          {childDirectories.length ? (isExpanded ? "−" : "+") : ""}
        </button>
        <button
          type="button"
          onClick={() => onSelectPath(node.path)}
          className={[
            "block min-w-0 flex-1 truncate px-3 py-2 text-left transition",
            isSelected
              ? "rounded-2xl bg-[#d8c69a] text-[#1e2118] shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
              : "rounded-2xl text-[#d8d0bd] hover:bg-[#2a2f22]",
          ].join(" ")}
          style={{ paddingLeft: `${8 + depth * 10}px` }}
        >
          {node.name}
        </button>
      </div>
      {isExpanded && childDirectories.length ? (
        <div className="mt-1 space-y-1">
          {childDirectories.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelectPath={onSelectPath}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
