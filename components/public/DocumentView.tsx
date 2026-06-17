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
    <article className="public-shell text-[#f7f4ea]">
      <div className="public-frame grid gap-8 py-6 sm:py-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
        <aside className="space-y-4 text-sm text-[#d8d0bd] lg:sticky lg:top-8 lg:self-start">
          <div className="public-glass rounded-[2rem] p-4">
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="public-action inline-flex rounded-full bg-white/10 px-4 py-2 font-medium text-white">
                홈
              </Link>
              <Link href="/blog" className="public-action inline-flex rounded-full bg-[#ffd36a] px-4 py-2 font-bold text-[#080b12]">
                글 목록
              </Link>
              <Link href="/map" className="public-action inline-flex rounded-full border border-white/15 px-4 py-2 font-medium text-white">
                학습 지도
              </Link>
            </div>
            <p className="mt-5 break-all font-mono text-xs leading-5 text-[#9cecff]">{document.path}</p>
          </div>
          {document.kind === "note" ? (
            <div className="public-glass rounded-[2rem] p-4">
              <NoteDeleteControl title={document.title} path={document.path} />
            </div>
          ) : null}
          {headings.length ? (
            <div className="public-glass rounded-[2rem] p-4">
              <p className="mb-3 text-xs font-bold uppercase text-[#c7f05a]">On this page</p>
              <div className="space-y-2 border-l border-[#5de7ff]/35 pl-4">
                {headings.map((heading) => (
                  <HashLink
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`block hover:text-white ${heading.depth > 2 ? "pl-3 text-xs" : ""}`}
                  >
                    {heading.text}
                  </HashLink>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
        <main className="public-paper rounded-[2rem] px-5 py-7 text-[#211f1a] md:px-10 md:py-12 2xl:-rotate-1">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#211f1a]/10 pb-5">
            <span className="rounded-full bg-[#080b12] px-3 py-1 font-mono text-xs font-bold text-[#f7f4ea]">
              {document.kind}
            </span>
            <span className="break-all font-mono text-xs text-[#6f6658]">{document.path}</span>
          </div>
          <div className="2xl:rotate-1">
            <MarkdownArticle
              markdown={document.body}
              imageSource={{
                owner: document.owner,
                repo: document.repo,
                branch: document.branch,
                path: document.path,
              }}
            />
          </div>
        </main>
      </div>
    </article>
  );
}
