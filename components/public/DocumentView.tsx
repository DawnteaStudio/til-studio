import Link from "next/link";
import type { IndexedDocument } from "@/lib/content/types";
import { extractHeadingAnchors } from "@/lib/content/markdown";
import { HashLink } from "./HashLink";
import { MarkdownArticle } from "./MarkdownArticle";
import { NoteDeleteControl } from "./NoteDeleteControl";

interface DocumentViewProps {
  document: IndexedDocument & {
    owner: string;
    repo: string;
    branch: string;
  };
}

export function DocumentView({ document }: DocumentViewProps) {
  const headings = extractHeadingAnchors(document.body);

  return (
    <article className="min-h-screen bg-[#e8dfd0] text-[#211f1a]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-4 text-sm text-[#655d51] lg:sticky lg:top-8 lg:self-start">
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="inline-flex rounded-full bg-[#25231d] px-4 py-2 font-medium text-[#f3ead8]">
            홈
          </Link>
          <Link href="/blog" className="inline-flex rounded-full bg-[#d8c69a] px-4 py-2 font-medium text-[#211f1a]">
            글 목록
          </Link>
          <Link href="/map" className="inline-flex rounded-full border border-[#c8bba7] px-4 py-2 font-medium">
            학습 지도
          </Link>
        </div>
        {document.kind === "note" ? (
          <NoteDeleteControl title={document.title} path={document.path} />
        ) : null}
        <div className="space-y-2 border-l border-[#c8bba7] pl-4">
          {headings.map((heading) => (
            <HashLink
              key={heading.id}
              href={`#${heading.id}`}
              className={`block hover:text-[#211f1a] ${heading.depth > 2 ? "pl-3 text-xs" : ""}`}
            >
              {heading.text}
            </HashLink>
          ))}
        </div>
      </aside>
      <main className="rounded-[2rem] bg-[#f1eadc] px-6 py-8 shadow-[0_22px_70px_rgba(59,50,35,0.16)] md:px-10 md:py-12">
        <p className="mb-4 font-mono text-xs text-[#7c725f]">{document.path}</p>
        <MarkdownArticle
          markdown={document.body}
          imageSource={{
            owner: document.owner,
            repo: document.repo,
            branch: document.branch,
            path: document.path,
          }}
        />
      </main>
      </div>
    </article>
  );
}
