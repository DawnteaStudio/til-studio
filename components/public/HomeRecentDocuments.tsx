"use client";

import Link from "next/link";
import { sortByRecent, type ArchiveArticle } from "@/lib/content/archive";
import { useVisibleRootPaths } from "./useVisibleRootPaths";
import { ArchiveArticleRow } from "./ArchiveArticleRow";

interface HomeRecentDocumentsProps {
  articles: ArchiveArticle[];
  paths: string[];
  initialVisibleRootPaths?: string[];
}

export function HomeRecentDocuments({ articles, paths, initialVisibleRootPaths }: HomeRecentDocumentsProps) {
  const { visibleRootPaths } = useVisibleRootPaths(paths, initialVisibleRootPaths);
  const visible = sortByRecent(articles.filter((article) => visibleRootPaths.includes(article.area)));
  const notes = visible.filter((article) => article.kind === "note").length;
  return (
    <section aria-labelledby="recent-heading" className="public-paper mb-8 rounded-3xl px-5 py-6 text-[#211f1a] sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="recent-heading" className="text-2xl font-bold">최근 기록</h2>
        <p className="flex flex-wrap gap-x-3 text-sm text-[#605a50]">
          <span>전체 {visible.length}편</span><span>학습 노트 {notes}편</span><span>개념 정리 {visible.length - notes}편</span>
        </p>
      </div>
      <ol aria-label="최근 기록">{visible.slice(0, 6).map((article) => <ArchiveArticleRow key={article.path} article={article} />)}</ol>
      {visible.length ? <Link href="/blog" className="mt-3 inline-flex py-2 text-sm font-bold underline underline-offset-4">글 전체 보기</Link>
        : <p className="py-4 text-[#605a50]">공개한 폴더에 아직 등록된 글이 없습니다.</p>}
    </section>
  );
}
