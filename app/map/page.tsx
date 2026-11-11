import { GitHubReadHelp } from "@/components/public/GitHubReadHelp";
import { LearningMap } from "@/components/public/LearningMap";
import { ReaderNavigation } from "@/components/public/ReaderNavigation";
import { loadReaderArchive } from "@/components/public/reader-archive";

export const dynamic = "force-dynamic";

export default async function MapPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const [{ view }, archive] = await Promise.all([searchParams, loadReaderArchive().catch(() => null)]);
  const unlinked = view === "unlinked";
  if (!archive) {
    return (
      <main className="public-shell text-[#f7f4ea]">
        <div className="public-frame py-5 sm:py-8">
          <ReaderNavigation current="학습 지도" />
          <h1 className="pt-8 text-4xl font-bold">{unlinked ? "GitHub에 올린 실습 찾기" : "학습 지도"}</h1>
          <div className="public-paper my-6 max-w-2xl rounded-3xl p-5 text-[#29261f] sm:p-6"><GitHubReadHelp /></div>
        </div>
      </main>
    );
  }
  return <LearningMap {...archive} view={unlinked ? "unlinked" : "all"} />;
}
