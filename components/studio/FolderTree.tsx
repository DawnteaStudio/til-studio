import type { ContentNode } from "@/lib/content/types";

interface FolderTreeProps {
  tree: ContentNode;
  selectedPath: string;
  onSelectPath(path: string): void;
}

export function FolderTree({ tree, selectedPath, onSelectPath }: FolderTreeProps) {
  return (
    <nav className="space-y-1 text-sm">
      <p className="font-medium text-zinc-950">{tree.name}</p>
      <div className="space-y-1">
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
          isSelected ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100",
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
