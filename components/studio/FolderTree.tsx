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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Repository</p>
        <p className="mt-2 text-lg font-semibold text-zinc-950">{tree.name}</p>
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
          "block w-full rounded px-2 py-1.5 text-left",
          isSelected
            ? "rounded-xl bg-zinc-950 text-white shadow-sm"
            : "rounded-xl text-zinc-700 hover:bg-zinc-100",
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
