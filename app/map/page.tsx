import { LearningMap } from "@/components/public/LearningMap";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const snapshot = await fetchRepositoryMarkdownSnapshot();

  return (
    <main className="min-h-screen bg-[#151611] text-[#f4efe4]">
      <LearningMap
        tree={snapshot.tree}
        paths={snapshot.paths}
        owner={snapshot.owner}
        repo={snapshot.repo}
        branch={snapshot.branch}
      />
    </main>
  );
}
