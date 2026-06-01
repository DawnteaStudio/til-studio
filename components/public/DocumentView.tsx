import type { IndexedDocument } from "@/lib/content/types";
import { MarkdownArticle } from "./MarkdownArticle";

interface DocumentViewProps {
  document: IndexedDocument;
}

export function DocumentView({ document }: DocumentViewProps) {
  return (
    <article className="min-h-screen bg-[#e8dfd0] text-[#211f1a]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-4 text-sm text-[#655d51] lg:sticky lg:top-8 lg:self-start">
        <a href="/blog" className="inline-flex rounded-full bg-[#25231d] px-4 py-2 font-medium text-[#f3ead8]">
          글 목록
        </a>
        <div className="space-y-2 border-l border-[#c8bba7] pl-4">
          {document.headings.map((heading) => (
            <a key={heading} href={`#${heading.replace(/\s+/g, "-")}`} className="block hover:text-[#211f1a]">
              {heading}
            </a>
          ))}
        </div>
      </aside>
      <main className="rounded-[2rem] bg-[#f1eadc] px-6 py-8 shadow-[0_22px_70px_rgba(59,50,35,0.16)] md:px-10 md:py-12">
        <p className="mb-4 font-mono text-xs text-[#7c725f]">{document.path}</p>
        <MarkdownArticle markdown={document.body} />
      </main>
      </div>
    </article>
  );
}
