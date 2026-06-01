import { LearningMap } from "@/components/public/LearningMap";
import {
  folderVisibilityCookieName,
  parseVisibleRootFoldersValue,
  visibleRootFolders,
} from "@/lib/content/visibility";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const snapshot = await fetchRepositoryMarkdownSnapshot();
  const savedRoots = parseVisibleRootFoldersValue((await cookies()).get(folderVisibilityCookieName)?.value);
  const visibleRootPaths = visibleRootFolders(snapshot.paths, savedRoots);

  return (
    <main className="min-h-screen bg-[#151611] text-[#f4efe4]">
      <LearningMap
        tree={snapshot.tree}
        paths={snapshot.paths}
        owner={snapshot.owner}
        repo={snapshot.repo}
        branch={snapshot.branch}
        initialVisibleRootPaths={visibleRootPaths}
      />
    </main>
  );
}
