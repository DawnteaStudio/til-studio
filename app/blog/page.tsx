import { BlogIndex } from "@/components/public/BlogIndex";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const snapshot = await fetchRepositoryMarkdownSnapshot();

  return <BlogIndex paths={snapshot.paths} owner={snapshot.owner} repo={snapshot.repo} />;
}
