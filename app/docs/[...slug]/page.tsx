import { DocumentView } from "@/components/public/DocumentView";
import { resolveRepositoryMarkdownDocument } from "@/lib/github/repository";
import { notFound } from "next/navigation";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join("/");
  const document = await resolveRepositoryMarkdownDocument(path);

  if (!document) notFound();

  return <DocumentView document={document} />;
}
