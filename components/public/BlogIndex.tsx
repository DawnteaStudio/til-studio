"use client";

import { useSearchParams } from "next/navigation";
import { compareChapters, sortByRecent, type ArchiveArticle } from "@/lib/content/archive";
import { ArchiveArticleRow, topicLabel } from "./ArchiveArticleRow";
import { ReaderNavigation } from "./ReaderNavigation";
import { useVisibleRootPaths } from "./useVisibleRootPaths";

const selectStyle = "mt-1 h-11 w-full rounded-xl border border-[#b7afa2] bg-[#fffaf0] px-3 text-[#27241f]";

export function BlogIndex({ articles, roots }: { articles: ArchiveArticle[]; roots: string[] }) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const topic = searchParams.get("topic") ?? "";
  const source = searchParams.get("source") ?? "";
  const kind = searchParams.get("kind") ?? "";
  const sort = searchParams.get("sort") ?? (source ? "chapters" : "recent");
  const { visibleRootPaths } = useVisibleRootPaths(roots, roots);
  const visible = articles.filter((article) => visibleRootPaths.includes(article.area));
  const topics = [...new Set(visible.map((a) => `${a.area}/${a.topic}`))].sort();
  const inTopic = visible.filter((a) => !topic || topic === `${a.area}/${a.topic}`);
  const sources = [...new Set(inTopic.flatMap((article) => article.source ? [article.source] : []))].sort();
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matching = inTopic.filter((article) => {
    if ((source && source !== article.source) || (kind && kind !== article.kind)) return false;
    const searchable = [article.title, article.topic, article.source, article.path, ...article.headings].join(" ").toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
  const results = sort === "chapters"
    ? matching.sort((a, b) => a.area.localeCompare(b.area) || a.topic.localeCompare(b.topic) ||
        (a.source ?? "").localeCompare(b.source ?? "") || compareChapters(a, b))
    : sortByRecent(matching);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "topic") params.delete("source");
    if (key === "topic" || key === "source") params.delete("sort");
    const queryString = params.toString();
    window.history.replaceState(null, "", queryString ? `/blog?${queryString}` : "/blog");
  }

  return (
    <main className="public-shell text-[#f7f4ea]">
      <div className="public-frame py-5 sm:py-8">
        <ReaderNavigation current="글 목록" />
        <header className="pt-8 pb-5 sm:pt-11">
          <h1 className="text-4xl font-bold">글 목록</h1>
          <p className="mt-3 leading-6 text-[#d8d0bd]">제목이나 본문 소제목을 검색하거나, 주제와 시리즈를 골라 읽으세요.</p>
        </header>
        <section aria-label="글 검색과 필터" className="public-paper rounded-3xl p-5 text-[#29261f] sm:p-6">
          <label className="block text-sm font-bold">글 검색
            <input type="search" value={query} onChange={(e) => updateFilter("q", e.target.value)}
              placeholder="제목, 소제목, 자료 이름" className={selectStyle} />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="min-w-0 text-sm font-bold">주제
              <select className={selectStyle} value={topic} onChange={(e) => updateFilter("topic", e.target.value)}>
                <option value="">모든 주제</option>
                {topics.map((path) => <option key={path} value={path}>{topicLabel(path.split("/")[1])} · {path.split("/")[0]}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-sm font-bold">글 종류
              <select className={selectStyle} value={kind} onChange={(e) => updateFilter("kind", e.target.value)}>
                <option value="">모든 종류</option><option value="note">학습 노트</option><option value="theory">개념 정리</option>
              </select>
            </label>
            <label className="min-w-0 text-sm font-bold">시리즈
              <select className={selectStyle} value={source} onChange={(e) => updateFilter("source", e.target.value)}>
                <option value="">모든 시리즈</option>
                {sources.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-sm font-bold">정렬
              <select className={selectStyle} value={sort} onChange={(e) => updateFilter("sort", e.target.value)}>
                <option value="recent">최근순</option><option value="chapters">시리즈 장 순서</option>
              </select>
            </label>
          </div>
        </section>
        <section aria-labelledby="results-heading" className="public-paper mt-4 mb-8 rounded-3xl p-5 text-[#29261f] sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="results-heading" className="text-xl font-bold" aria-live="polite">검색 결과 {results.length}편</h2>
            {(query || topic || source || kind || sort !== "recent") && <button type="button"
              onClick={() => window.history.replaceState(null, "", "/blog")} className="px-2 py-2 text-sm underline underline-offset-4">필터 초기화</button>}
          </div>
          {results.length ? <ul>{results.map((article) => <ArchiveArticleRow key={article.path} article={article} />)}</ul>
            : <p className="py-6 text-[#605a50]">조건에 맞는 글이 없습니다. 다른 검색어나 주제를 선택해 보세요.</p>}
        </section>
      </div>
    </main>
  );
}
