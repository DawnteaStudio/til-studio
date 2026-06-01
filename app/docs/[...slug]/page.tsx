import { DocumentView } from "@/components/public/DocumentView";
import { fetchRepositoryMarkdownDocument } from "@/lib/github/repository";
import { notFound } from "next/navigation";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join("/");
  const document = await fetchRepositoryMarkdownDocument(path);

  if (!document) notFound();

  return <DocumentView document={document} />;
}
