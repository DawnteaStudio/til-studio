import { cookies } from "next/headers";
import { fetchRepositoryArchive } from "@/lib/github/archive";
import { folderVisibilityCookieName, parseVisibleRootFoldersValue, topLevelFolder, visibleRootFolders } from "@/lib/content/visibility";

export async function loadReaderArchive() {
  const [archive, cookieStore] = await Promise.all([fetchRepositoryArchive(), cookies()]);
  const selected = parseVisibleRootFoldersValue(cookieStore.get(folderVisibilityCookieName)?.value);
  const roots = visibleRootFolders(archive.allPaths, selected);
  const allowed = new Set(roots);
  return {
    owner: archive.owner,
    repo: archive.repo,
    branch: archive.branch,
    roots,
    articles: archive.articles.filter((article) => allowed.has(article.area)),
    practices: archive.practices.filter((practice) => allowed.has(topLevelFolder(practice.topicPath))),
  };
}
