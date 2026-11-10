import Link from "next/link";
import { HomeRecentDocuments } from "@/components/public/HomeRecentDocuments";
import { ReaderNavigation } from "@/components/public/ReaderNavigation";
import { loadReaderArchive } from "@/components/public/reader-archive";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { owner, repo, roots, articles } = await loadReaderArchive();
  return (
    <main className="public-shell text-[#f7f4ea]">
      <div className="public-frame py-5 sm:py-8">
        <ReaderNavigation current="홈" />
        <header className="pt-9 pb-7 sm:pt-14">
          <p className="font-mono text-sm text-[#9cecff]">{owner}/{repo}</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">학습 기록 보관소</h1>
          <p className="mt-3 max-w-xl leading-7 text-[#d8d0bd]">공부하며 쓴 노트와 개념 정리를 모았습니다. 최근 글부터 읽거나 주제별로 찾아보세요.</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
            <Link href="/blog" className="rounded-full bg-[#ffd36a] px-5 py-2.5 text-[#161616]">글 목록 보기</Link>
            <Link href="/map" className="rounded-full border border-[#9cecff]/50 px-5 py-2.5 text-[#9cecff]">학습 지도 열기</Link>
          </div>
        </header>
        <HomeRecentDocuments articles={articles} paths={roots} initialVisibleRootPaths={roots} />
      </div>
    </main>
  );
}
