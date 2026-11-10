import { BlogIndex } from "@/components/public/BlogIndex";
import { loadReaderArchive } from "@/components/public/reader-archive";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const { articles, roots } = await loadReaderArchive();
  return <BlogIndex articles={articles} roots={roots} />;
}
