"use client";

import Link from "next/link";
import { articleHref, compareChapters, linkPracticeHref, practiceHref, type ArchiveArticle, type Practice } from "@/lib/content/archive";
import { sourcePathForNote } from "@/lib/content/source-readme";
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
  view?: "all" | "unlinked";
}

const areaNames: Record<string, string> = {
  cs: "컴퓨터 과학", languages: "프로그래밍 언어", projects: "프로젝트",
  "software-engineering": "소프트웨어 공학", "coding-test": "코딩 테스트",
};

export function LearningMap({ articles, practices, roots, owner, repo, branch, view = "all" }: LearningMapProps) {
  const { visibleRootPaths } = useVisibleRootPaths(roots, roots);
  const visibleArticles = articles.filter((a) => visibleRootPaths.includes(a.area));
  const visiblePractices = practices.filter((p) => visibleRootPaths.includes(p.topicPath.split("/")[0]));
  const topics = [...new Set([...visibleArticles.map((a) => `${a.area}/${a.topic}`), ...visiblePractices.map((p) => p.topicPath)])].sort();
  const areas = [...new Set(topics.map((path) => path.split("/")[0]))];
  return (
    <main className="public-shell text-[#f7f4ea]">
      <div className="public-frame py-5 sm:py-8">
        <ReaderNavigation current="학습 지도" />
        {view === "unlinked" ? (
          <UnlinkedPractices practices={visiblePractices} articles={visibleArticles} />
        ) : (
          <>
            <header className="pt-8 pb-6 sm:pt-11">
              <h1 className="text-4xl font-bold">학습 지도</h1>
              <p className="mt-3 leading-6 text-[#d8d0bd]">주제별 글과 시리즈를 읽고, GitHub에 올린 실습을 노트에 연결하세요.</p>
              <p className="mt-3 text-sm text-[#9cecff]">{areas.length}개 분야 · {topics.length}개 주제 · 글 {visibleArticles.length}편</p>
              <Link href="/map?view=unlinked" className="mt-2 inline-flex min-h-11 items-center text-sm text-[#9cecff] underline underline-offset-4">연결할 실습 모아보기</Link>
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
          </>
        )}
        <a className="mb-6 inline-block py-2 text-sm text-[#9cecff] underline underline-offset-4"
          href={`https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch)}`}>GitHub에서 저장소 열기</a>
      </div>
    </main>
  );
}

function UnlinkedPractices({ articles, practices }: { articles: ArchiveArticle[]; practices: Practice[] }) {
  const sourceGroups = new Map<string, Practice[]>();
  for (const practice of practices) {
    const path = `${practice.topicPath}/notes/${practice.source}`;
    const group = sourceGroups.get(path);
    if (group) group.push(practice);
    else sourceGroups.set(path, [practice]);
  }
  const noteSources = new Set(articles.filter((article) => article.kind === "note").map((article) => sourcePathForNote(article.path)));
  return (
    <>
      <header className="pt-8 pb-5 sm:pt-11">
        <h1 className="text-4xl font-bold">GitHub에 올린 실습 찾기</h1>
        {sourceGroups.size > 0 && <p className="mt-3 max-w-2xl leading-6 text-[#d8d0bd]">GitHub에 올렸지만 아직 노트에 링크가 없는 코드 폴더입니다. 폴더를 골라 새 노트를 쓰거나 같은 자료에 이미 쓴 노트에 코드 링크를 추가하세요.</p>}
        <Link href="/map" className="mt-2 inline-flex min-h-11 items-center text-sm text-[#9cecff] underline underline-offset-4">전체 학습 지도 보기</Link>
      </header>
      {sourceGroups.size === 0 ? (
        <section className="public-paper mb-6 max-w-2xl rounded-3xl p-5 text-[#29261f] sm:p-6">
          <h2 className="text-lg font-bold">공개한 자료에 아직 연결할 실습이 없습니다.</h2>
          <p className="mt-2 leading-6">자료의 <code>src/실습이름/</code> 폴더에 실습 파일을 올리면 이곳에 표시됩니다. 이미 연결한 실습은 해당 노트에서 열 수 있습니다.</p>
          <Link href="/studio" className="mt-2 inline-flex min-h-11 items-center font-semibold text-[#204a78] underline underline-offset-4">Studio에서 노트 쓰기</Link>
        </section>
      ) : (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {Array.from(sourceGroups).sort(([a], [b]) => a.localeCompare(b, "ko", { numeric: true })).map(([path, group]) => {
            const { source, topicPath } = group[0];
            const [area, topic] = topicPath.split("/");
            return (
              <section key={path} className="public-paper min-w-0 rounded-3xl p-5 text-[#29261f] sm:p-6">
                <p className="text-sm text-[#605a50]">{areaNames[area] ?? area} · {topicLabel(topic)}</p>
                <h2 className="mt-1 break-all text-xl font-bold">{source}</h2>
                <PracticeList practices={group} hasExistingNote={noteSources.has(path)} />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function PracticeList({ practices, hasExistingNote }: { practices: Practice[]; hasExistingNote: boolean }) {
  return (
    <ul className="mt-2 divide-y divide-[#211f1a]/10">
      {practices.map((p) => <li key={p.slug} className="py-2">
        <span className="block break-all font-mono">{p.slug}</span>
        <div className="flex flex-wrap gap-x-4">
          <Link href={practiceHref(p)} aria-label={`${p.slug} · 이 실습으로 노트 쓰기`}
            className="inline-flex min-h-11 items-center font-semibold text-[#204a78] underline underline-offset-4">이 실습으로 노트 쓰기</Link>
          {hasExistingNote && <Link href={linkPracticeHref(p.topicPath, p.source, p.slug)} aria-label={`${p.slug} · 이미 쓴 노트에 코드 링크 추가`}
            className="inline-flex min-h-11 items-center font-semibold text-[#204a78] underline underline-offset-4">이미 쓴 노트에 코드 링크 추가</Link>}
        </div>
      </li>)}
    </ul>
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
        const hasExistingNote = chapters.some((a) => a.kind === "note" && sourcePathForNote(a.path) === `${path}/notes/${name}`);
        const waiting = chapters.filter((article) => article.pendingPractices?.length);
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
            {waiting.length > 0 && <details className="mt-3 rounded-xl bg-[#dfd7c8]/70 px-3 py-2 text-sm">
              <summary className="cursor-pointer py-1 font-semibold">코드를 기다리는 노트 {waiting.length}편</summary>
              <p className="mt-2 text-[#605a50]">표시된 폴더에 실습 파일을 올리면 노트와 연결됩니다.</p>
              <ul className="divide-y divide-[#211f1a]/10">
                {waiting.map((article) => <li key={article.path} className="py-2">
                  <Link href={articleHref(article.path)} className="font-semibold text-[#204a78] underline underline-offset-4">{article.title}</Link>
                  {article.pendingPractices?.map((slug) => <code key={slug} className="mt-1 block break-all">{path}/notes/{name}/src/{slug}/</code>)}
                </li>)}
              </ul>
            </details>}
            {pending.length > 0 && <details className="mt-3 rounded-xl bg-[#dfd7c8]/70 px-3 py-2 text-sm">
              <summary className="cursor-pointer py-1 font-semibold">아직 노트와 연결되지 않은 실습 {pending.length}개</summary>
              <PracticeList practices={pending} hasExistingNote={hasExistingNote} />
            </details>}
          </div>
        );
      })}
    </article>
  );
}
