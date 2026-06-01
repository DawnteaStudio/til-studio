import Link from "next/link";
import { cookies } from "next/headers";
import { HomeRecentDocuments } from "@/components/public/HomeRecentDocuments";
import {
  folderVisibilityCookieName,
  parseVisibleRootFoldersValue,
  visibleRootFolders,
} from "@/lib/content/visibility";
import { fetchRepositoryMarkdownSnapshot } from "@/lib/github/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await fetchRepositoryMarkdownSnapshot();
  const savedRoots = parseVisibleRootFoldersValue((await cookies()).get(folderVisibilityCookieName)?.value);
  const visibleRootPaths = visibleRootFolders(snapshot.paths, savedRoots);
  const noteCount = snapshot.paths.filter((path) => path.includes("/notes/")).length;
  const theoryCount = snapshot.paths.filter((path) => path.includes("/theory/")).length;

  return (
    <main className="min-h-screen bg-[#151611] text-[#f4efe4]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-8">
        <nav className="flex items-center justify-between">
          <p className="text-lg font-semibold">til-studio</p>
          <div className="flex gap-4 text-sm text-[#cec4ae]">
            <Link href="/blog" className="hover:text-[#f4efe4]">Blog</Link>
            <Link href="/map" className="hover:text-[#f4efe4]">Map</Link>
            <Link href="/studio" className="hover:text-[#f4efe4]">Studio</Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9da88c]">
              {snapshot.owner}/{snapshot.repo}
            </p>
            <h1 className="mt-5 max-w-4xl text-6xl font-semibold leading-[1.05] tracking-tight">
              공부 기록을 쓰고, 정리하고, 블로그처럼 보여주는 TIL 작업실
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#c8bea8]">
              GitHub TIL 저장소를 그대로 사용하면서 작성 경험은 더 편하게, 공개 화면은
              포트폴리오와 학습 아카이브처럼 보이도록 만든 도구입니다.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/studio"
                className="rounded-2xl bg-[#d8c69a] px-5 py-3 text-sm font-semibold text-[#1e2118]"
              >
                글 작성하기
              </Link>
              <Link
                href="/blog"
                className="rounded-2xl bg-[#24281e] px-5 py-3 text-sm font-semibold text-[#f4efe4]"
              >
                글 보러가기
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#24281e] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="docs" value={snapshot.paths.length} />
              <Metric label="notes" value={noteCount} />
              <Metric label="theory" value={theoryCount} />
            </div>
            <HomeRecentDocuments paths={snapshot.paths} initialVisibleRootPaths={visibleRootPaths} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-[#1b1f17] p-4 text-center">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9d957f]">{label}</p>
    </div>
  );
}
