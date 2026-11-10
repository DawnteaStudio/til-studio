"use client";

import Link from "next/link";
import { articleHref, compareChapters, practiceHref, type ArchiveArticle, type Practice } from "@/lib/content/archive";
import { blogHref, topicLabel } from "./ArchiveArticleRow";
import { ReaderNavigation } from "./ReaderNavigation";
import { useVisibleRootPaths } from "./useVisibleRootPaths";

interface LearningMapProps {
  articles: ArchiveArticle[];
  practices: Practice[];
  roots: string[];
  owner: string;
  repo: string;
  branch: string;
}

const areaNames: Record<string, string> = {
  cs: "컴퓨터 과학", languages: "프로그래밍 언어", projects: "프로젝트",
  "software-engineering": "소프트웨어 공학", "coding-test": "코딩 테스트",
};

export function LearningMap({ articles, practices, roots, owner, repo, branch }: LearningMapProps) {
  const { visibleRootPaths } = useVisibleRootPaths(roots, roots);
  const visibleArticles = articles.filter((a) => visibleRootPaths.includes(a.area));
  const visiblePractices = practices.filter((p) => visibleRootPaths.includes(p.topicPath.split("/")[0]));
  const topics = [...new Set([...visibleArticles.map((a) => `${a.area}/${a.topic}`), ...visiblePractices.map((p) => p.topicPath)])].sort();
  const areas = [...new Set(topics.map((path) => path.split("/")[0]))];
  return (
    <main className="public-shell text-[#f7f4ea]">
      <div className="public-frame py-5 sm:py-8">
        <ReaderNavigation current="학습 지도" />
        <header className="pt-8 pb-6 sm:pt-11">
          <h1 className="text-4xl font-bold">학습 지도</h1>
          <p className="mt-3 leading-6 text-[#d8d0bd]">주제별 글과 시리즈를 살펴보고, 기록을 기다리는 실습을 노트로 이어가세요.</p>
          <p className="mt-3 text-sm text-[#9cecff]">{areas.length}개 분야 · {topics.length}개 주제 · 글 {visibleArticles.length}편</p>
        </header>
        {areas.length === 0 && <p className="public-paper rounded-2xl p-5 text-[#29261f]">공개한 폴더에 아직 등록된 글이나 실습이 없습니다.</p>}
        {areas.map((area) => (
          <section key={area} className="mb-7">
            <h2 className="mb-3 text-2xl font-bold">{areaNames[area] ?? area}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {topics.filter((path) => path.split("/")[0] === area).map((path) => (
                <TopicCard key={path} path={path} articles={visibleArticles.filter((a) => `${a.area}/${a.topic}` === path)}
                  practices={visiblePractices.filter((p) => p.topicPath === path)} />
              ))}
            </div>
          </section>
        ))}
        <a className="mb-6 inline-block py-2 text-sm text-[#9cecff] underline underline-offset-4"
          href={`https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch)}`}>GitHub에서 저장소 열기</a>
      </div>
    </main>
  );
}

function TopicCard({ path, articles, practices }: { path: string; articles: ArchiveArticle[]; practices: Practice[] }) {
  const topic = topicLabel(path.split("/")[1]);
  const series = [...new Set([...articles.flatMap((a) => a.source ? [a.source] : []), ...practices.map((p) => p.source)])].sort();
  const notes = articles.filter((a) => a.kind === "note").length;
  return (
    <article className="public-paper min-w-0 rounded-3xl p-5 text-[#29261f] sm:p-6">
      <header className="mb-3">
        <h3 className="text-xl font-bold">{topic}</h3>
        <p className="mt-1 text-sm text-[#605a50]">학습 노트 {notes}편 · 개념 정리 {articles.length - notes}편</p>
      </header>
      {articles.length > 0 && <Link href={blogHref(path)} className="inline-flex py-2 text-sm font-bold text-[#204a78] underline underline-offset-4">
        {topic} 글 {articles.length}편 전체 보기
      </Link>}
      {articles.filter((a) => !a.source).slice(0, 3).map((a) => <Link key={a.path} className="block py-1.5 text-sm hover:underline" href={articleHref(a.path)}>{a.title}</Link>)}
      {series.map((name) => {
        const chapters = articles.filter((a) => a.source === name).sort(compareChapters);
        const pending = practices.filter((p) => p.source === name);
        return (
          <div key={name} className="mt-3 border-t border-[#211f1a]/15 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="break-words font-bold">{name}</h4>
              {chapters.length > 0 && <Link className="py-1 text-sm font-semibold text-[#204a78] underline underline-offset-4" href={blogHref(path, name)}>
                {name} 시리즈 {chapters.length}편
              </Link>}
            </div>
            {chapters.length > 0 && <ol className="mt-1 list-inside list-disc text-sm">
              {chapters.slice(0, 3).map((a) => <li key={a.path} className="py-1"><Link href={articleHref(a.path)} className="hover:underline">{a.title}</Link></li>)}
            </ol>}
            {pending.length > 0 && <details className="mt-3 rounded-xl bg-[#dfd7c8]/70 px-3 py-2 text-sm">
              <summary className="cursor-pointer py-1 font-semibold">노트가 없는 실습 {pending.length}개</summary>
              <ul className="mt-2 divide-y divide-[#211f1a]/10">
                {pending.map((p) => <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="break-all font-mono">{p.slug}</span>
                  <Link href={practiceHref(p)} aria-label={`${p.slug} · 이 실습으로 노트 쓰기`}
                    className="py-1 font-semibold text-[#204a78] underline underline-offset-4">이 실습으로 노트 쓰기</Link>
                </li>)}
              </ul>
            </details>}
          </div>
        );
      })}
    </article>
  );
}
