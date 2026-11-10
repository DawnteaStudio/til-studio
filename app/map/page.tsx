import { LearningMap } from "@/components/public/LearningMap";
import { loadReaderArchive } from "@/components/public/reader-archive";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const { articles, practices, roots, owner, repo, branch } = await loadReaderArchive();
  return <LearningMap articles={articles} practices={practices} roots={roots} owner={owner} repo={repo} branch={branch} />;
}
