import Link from "next/link";
import type { IndexedDocument } from "@/lib/content/types";
import { articleHref, type ArchiveArticle } from "@/lib/content/archive";
import { extractHeadingAnchors } from "@/lib/content/markdown";
import { ArticleDate, blogHref, topicLabel } from "./ArchiveArticleRow";
import { ReaderNavigation } from "./ReaderNavigation";
import { HashLink } from "./HashLink";
import { MarkdownArticle } from "./MarkdownArticle";
import { NoteDeleteControl } from "./NoteDeleteControl";

interface DocumentViewProps {
  document: IndexedDocument & { owner: string; repo: string; branch: string };
  article?: ArchiveArticle;
  previous?: ArchiveArticle;
  next?: ArchiveArticle;
}

export function DocumentView({ document, article, previous, next }: DocumentViewProps) {
  const headings = extractHeadingAnchors(document.body);
  const topicPath = article && `${article.area}/${article.topic}`;
  return (
    <main className="public-shell text-[#f7f4ea]">
      <div className="public-frame py-5 sm:py-8">
        <ReaderNavigation />
        <article className="public-paper mx-auto mt-5 max-w-4xl min-w-0 rounded-3xl p-5 text-[#211f1a] sm:p-8 lg:p-12">
          <header className="mb-5 border-b border-[#211f1a]/15 pb-4 text-sm text-[#605a50]">
            {article && topicPath ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span>{article.kind === "note" ? "학습 노트" : "개념 정리"}</span>
                <Link className="underline underline-offset-4" href={blogHref(topicPath)}>{topicLabel(article.topic)}</Link>
                {article.source && <Link className="underline underline-offset-4" href={blogHref(topicPath, article.source)}>{article.source} 시리즈</Link>}
                <ArticleDate article={article} />
              </div>
            ) : <span className="break-all">{document.path}</span>}
          </header>
          {headings.length > 0 && <details className="mb-6 rounded-xl border border-[#211f1a]/15 px-4 py-2 text-sm">
            <summary className="cursor-pointer py-1 font-bold">이 글의 목차</summary>
            <nav className="grid gap-2 py-2" aria-label="본문 목차">
              {headings.map((h) => <HashLink key={h.id} href={`#${h.id}`}
                className={`hover:underline ${h.depth > 2 ? "pl-3" : ""}`}>{h.text}</HashLink>)}
            </nav>
          </details>}
          <div className="[overflow-wrap:anywhere]">
            <MarkdownArticle markdown={document.body} imageSource={{ owner: document.owner, repo: document.repo, branch: document.branch, path: document.path }} />
          </div>
          {article?.source && topicPath && (
            <nav aria-label="시리즈 이어 읽기" className="mt-9 border-t border-[#211f1a]/20 pt-5">
              <Link href={blogHref(topicPath, article.source)} className="font-bold underline underline-offset-4">{article.source} 시리즈 전체 보기</Link>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {previous && <Link rel="prev" href={articleHref(previous.path)} className="rounded-xl bg-[#dfd7c8] p-3 hover:underline">
                  <span className="block text-xs text-[#605a50]">이전 글</span>{previous.title}</Link>}
                {next && <Link rel="next" href={articleHref(next.path)} className="rounded-xl bg-[#dfd7c8] p-3 hover:underline">
                  <span className="block text-xs text-[#605a50]">다음 글</span>{next.title}</Link>}
              </div>
            </nav>
          )}
        </article>
        {document.kind === "note" && <div className="public-glass mx-auto mt-4 max-w-4xl rounded-2xl p-4">
          <NoteDeleteControl title={document.title} path={document.path} />
        </div>}
      </div>
    </main>
  );
}
