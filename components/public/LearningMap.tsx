import type { ContentNode } from "@/lib/content/types";

interface LearningMapProps {
  node: ContentNode;
}

export function LearningMap({ node }: LearningMapProps) {
  return (
    <div className="space-y-3">
      <div className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-950">
        {node.name}
      </div>
      {node.children?.length ? (
        <div className="ml-5 border-l border-zinc-200 pl-4">
          {node.children.map((child) => (
            <LearningMap key={child.path} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
