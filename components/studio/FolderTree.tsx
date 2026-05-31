import type { ContentNode } from "@/lib/content/types";

interface FolderTreeProps {
  tree: ContentNode;
  selectedPath: string;
  onSelectPath(path: string): void;
}

export function FolderTree({ tree, selectedPath, onSelectPath }: FolderTreeProps) {
  const children = tree.children ?? [];

  return (
    <nav className="space-y-1 text-sm">
      <p className="font-medium text-zinc-950">{tree.name}</p>
      {children.map((node) => (
        <button
          key={node.path}
          type="button"
          onClick={() => onSelectPath(node.path)}
          className={[
            "block w-full rounded px-2 py-1.5 text-left",
            selectedPath === node.path
              ? "bg-zinc-950 text-white"
              : "text-zinc-700 hover:bg-zinc-100",
          ].join(" ")}
        >
          {node.name}
        </button>
      ))}
    </nav>
  );
}
