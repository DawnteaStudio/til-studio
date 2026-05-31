import { LearningMap } from "@/components/public/LearningMap";
import type { ContentNode } from "@/lib/content/types";

const sampleTree: ContentNode = {
  name: "TIL",
  path: "",
  type: "directory",
  kind: "other",
  children: [
    {
      name: "cs",
      path: "cs",
      type: "directory",
      kind: "other",
      children: [
        {
          name: "spring",
          path: "cs/spring",
          type: "directory",
          kind: "other",
          children: [
            {
              name: "notes",
              path: "cs/spring/notes",
              type: "directory",
              kind: "other",
              children: [],
            },
            {
              name: "theory",
              path: "cs/spring/theory",
              type: "directory",
              kind: "other",
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

export default function MapPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-zinc-950">
      <h1 className="mb-6 text-2xl font-semibold">Learning Map</h1>
      <LearningMap node={sampleTree} />
    </main>
  );
}
