import { BlogIndex } from "@/components/public/BlogIndex";
import {
  folderVisibilityCookieName,
  parseVisibleRootFoldersValue,
  visibleRootFolders,
} from "@/lib/content/visibility";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const snapshot = await fetchRepositoryMarkdownSnapshot();
  const savedRoots = parseVisibleRootFoldersValue((await cookies()).get(folderVisibilityCookieName)?.value);
  const visibleRootPaths = visibleRootFolders(snapshot.paths, savedRoots);

  return (
    <BlogIndex
      paths={snapshot.paths}
      owner={snapshot.owner}
      repo={snapshot.repo}
      initialVisibleRootPaths={visibleRootPaths}
    />
  );
}
