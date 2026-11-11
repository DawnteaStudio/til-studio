import { notFound } from "next/navigation";
import { DocumentView } from "@/components/public/DocumentView";
import { loadReaderArchive } from "@/components/public/reader-archive";
import { compareChapters } from "@/lib/content/archive";
import { isPublishedPath } from "@/lib/content/publication";
import { topLevelFolder } from "@/lib/content/visibility";
import { resolveRepositoryMarkdownDocument } from "@/lib/github/repository";

export default async function DocumentPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join("/");
  if (!isPublishedPath(path)) notFound();
  const archive = await loadReaderArchive();
  if (!archive.roots.includes(topLevelFolder(path))) notFound();
  const document = await resolveRepositoryMarkdownDocument(path);
  if (!document || !isPublishedPath(document.path) || !archive.roots.includes(topLevelFolder(document.path))) notFound();

  const article = archive.articles.find((a) => a.path === document.path);
  const chapters = article?.source
    ? archive.articles.filter((a) => a.area === article.area && a.topic === article.topic && a.source === article.source).sort(compareChapters)
    : [];
  const index = chapters.findIndex((a) => a.path === document.path);
  return <DocumentView document={document} article={article} previous={chapters[index - 1]} next={index >= 0 ? chapters[index + 1] : undefined} />;
}
