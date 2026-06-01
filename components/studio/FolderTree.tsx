import type { ContentNode } from "@/lib/content/types";

interface FolderTreeProps {
  tree: ContentNode;
  selectedPath: string;
  onSelectPath(path: string): void;
}

export function FolderTree({ tree, selectedPath, onSelectPath }: FolderTreeProps) {
  return (
    <nav className="space-y-3 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d9a7b]">Repository</p>
        <p className="mt-2 text-2xl font-semibold text-[#f3ecd8]">{tree.name}</p>
      </div>
      <div className="space-y-1.5">
        {(tree.children ?? []).map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            selectedPath={selectedPath}
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
  onSelectPath,
  depth = 0,
}: {
  node: ContentNode;
  selectedPath: string;
  onSelectPath(path: string): void;
  depth?: number;
}) {
  const isDirectory = node.type === "directory";
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (isDirectory) onSelectPath(node.path);
        }}
        disabled={!isDirectory}
        className={[
          "block w-full px-3 py-2 text-left transition",
          isSelected
            ? "rounded-2xl bg-[#d8c69a] text-[#1e2118] shadow-[0_12px_26px_rgba(0,0,0,0.18)]"
            : "rounded-2xl text-[#d8d0bd] hover:bg-[#2a2f22]",
          !isDirectory ? "cursor-default opacity-60 hover:bg-transparent" : "",
        ].join(" ")}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {node.name}
      </button>
      {node.children?.length ? (
        <div className="space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelectPath={onSelectPath}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
