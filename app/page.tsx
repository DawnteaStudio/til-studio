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
    <main className="public-shell text-[#f7f4ea]">
      <section className="public-frame flex min-h-screen flex-col py-6 sm:py-8">
        <nav className="public-nav rounded-full px-4 py-3 sm:px-5">
          <p className="text-base font-semibold sm:text-lg">til-studio</p>
          <div className="flex items-center gap-2 text-sm text-[#d6d0c6] sm:gap-3">
            <Link href="/blog" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
              Blog
            </Link>
            <Link href="/map" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
              Map
            </Link>
            <Link href="/studio" className="rounded-full bg-white/10 px-3 py-2 transition hover:bg-[#ffd36a] hover:text-[#080b12]">
              Studio
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,0.98fr)_minmax(420px,0.82fr)] lg:py-16">
          <section className="relative">
            <div className="public-marquee mb-8 rounded-full border border-white/10 bg-white/[0.04] py-3 text-xs font-semibold uppercase text-[#9cecff]">
              <div className="public-marquee-track">
                {["notes", "theory", "github", "learning map", "markdown", "source link", "notes", "theory"].map(
                  (item, index) => (
                    <span key={`${item}-${index}`}>{item}</span>
                  ),
                )}
              </div>
            </div>
            <p className="font-mono text-xs uppercase text-[#c7f05a]">
              {snapshot.owner}/{snapshot.repo}
            </p>
            <h1 className="mt-5 max-w-5xl text-7xl font-black leading-[0.86] tracking-normal sm:text-8xl lg:text-9xl">
              TIL
              <span className="block text-[#5de7ff]">archive</span>
              <span className="block text-[#ffd36a]">system</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-[#d8d0bd] sm:text-lg">
              GitHub 저장소 구조는 그대로 유지하면서, 작성은 Studio에서 빠르게 하고 공개 화면은
              학습 흐름이 살아있는 아카이브처럼 탐색합니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/studio"
                className="public-action rounded-full bg-[#ffd36a] px-6 py-3 text-sm font-bold text-[#080b12]"
              >
                글 작성하기
              </Link>
              <Link
                href="/blog"
                className="public-action rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-bold text-white"
              >
                글 보러가기
              </Link>
              <Link
                href="/map"
                className="public-action rounded-full border border-[#5de7ff]/30 px-6 py-3 text-sm font-bold text-[#9cecff]"
              >
                지도 열기
              </Link>
            </div>
          </section>

          <section className="relative min-h-[520px]">
            <div className="absolute left-2 top-4 hidden h-[92%] w-1 rounded-full public-step-line lg:block" />
            <div className="grid gap-4 sm:grid-cols-3 lg:ml-10 lg:grid-cols-1">
              <Metric label="docs" value={snapshot.paths.length} tone="cyan" />
              <Metric label="notes" value={noteCount} tone="amber" />
              <Metric label="theory" value={theoryCount} tone="pink" />
            </div>
            <div className="mt-6 lg:ml-24 lg:-rotate-1">
              <HomeRecentDocuments paths={snapshot.paths} initialVisibleRootPaths={visibleRootPaths} />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "cyan" | "amber" | "pink" }) {
  const toneClass = {
    cyan: "text-[#5de7ff]",
    amber: "text-[#ffd36a]",
    pink: "text-[#ff7af7]",
  }[tone];

  return (
    <div className="public-glass rounded-[1.35rem] px-5 py-4 first:rotate-1 last:-rotate-1">
      <p className={`text-4xl font-black ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs uppercase text-[#c8c0b1]">{label}</p>
    </div>
  );
}
