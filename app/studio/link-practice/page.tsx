import { requireAdminPage } from "@/lib/auth/access";
import Link from "next/link";
import { GitHubReadHelp } from "@/components/public/GitHubReadHelp";
import { ReaderNavigation } from "@/components/public/ReaderNavigation";
import { LinkPracticeForm } from "@/components/studio/LinkPracticeForm";
import { compareChapters, linkPracticeHref, practiceHref } from "@/lib/content/archive";
import { sourcePracticeSlugs } from "@/lib/content/paths";
import { isValidPracticeName } from "@/lib/content/practice-links";
import { sourcePathForNote } from "@/lib/content/source-readme";
import { deriveStudyTarget } from "@/lib/content/studio-target";
import { fetchRepositoryArchive } from "@/lib/github/archive";

export const dynamic = "force-dynamic";

type Query = Record<string, string | string[] | undefined>;

async function selection(query: Query) {
  const { topic, source, practice } = query;
  if (typeof topic !== "string" || topic.split("/").length !== 2 || !deriveStudyTarget(topic) ||
      typeof source !== "string" || !source || /[/\\]/u.test(source) || source === "." || source === ".." ||
      (practice !== undefined && (typeof practice !== "string" || !isValidPracticeName(practice)))) {
    return <p role="alert">자료를 찾을 수 없습니다. 학습 지도에서 연결할 실습을 선택하세요.</p>;
  }
  const archive = await fetchRepositoryArchive();
  const sourcePath = `${topic}/notes/${source}`;
  const notes = archive.articles.filter((article) =>
    article.kind === "note" && sourcePathForNote(article.path) === sourcePath,
  ).sort(compareChapters).map(({ path, title }) => ({ path, title }));
  const practices = sourcePracticeSlugs(archive.allPaths, sourcePath).filter(isValidPracticeName);
  if (!notes.length || !practices.length) {
    return <div role="status">
      <p>{notes.length ? "이 자료에는 GitHub에 올린 코드 폴더가 없습니다." : "이 자료에는 GitHub에 저장한 노트가 없습니다."}</p>
      {practice && practices.includes(practice) && <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-[#204a78] underline underline-offset-4"
        href={practiceHref({ topicPath: topic, source, slug: practice })}>이 실습으로 노트 쓰기</Link>}
    </div>;
  }
  if (practice && !practices.includes(practice)) {
    return <div role="alert"><p>선택한 코드 폴더를 GitHub에서 찾을 수 없습니다.</p>
      <Link className="mt-3 inline-block underline" href={linkPracticeHref(topic, source)}>다른 코드 폴더 선택</Link></div>;
  }
  return <LinkPracticeForm key={JSON.stringify([archive.owner, archive.repo, archive.branch, topic, source, practice])}
    owner={archive.owner} repo={archive.repo} branch={archive.branch}
    topic={topic} source={source} notes={notes} practices={practices} initialPractice={practice ?? ""} />;
}

export default async function LinkPracticePage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireAdminPage("/studio/link-practice");
  let form;
  try {
    form = await selection(await searchParams);
  } catch {
    form = <GitHubReadHelp />;
  }
  return (
    <main className="public-shell text-[#f7f4ea]">
      <div className="public-frame py-5 sm:py-8">
        <ReaderNavigation />
        <div className="mx-auto max-w-2xl py-8">
          <Link href="/map?view=unlinked" className="text-sm text-[#9cecff] underline underline-offset-4">연결할 실습 목록으로</Link>
          <h1 className="mt-4 text-3xl font-bold">이미 쓴 노트에 코드 링크 추가</h1>
          <p className="mt-2 text-sm leading-6 text-[#d8d0bd]">같은 학습 자료에서 GitHub에 올린 코드 폴더와 이미 저장한 노트를 고르세요. 기본 브랜치에 반영되면 노트에 링크가 생깁니다. ‘GitHub에서 실습 코드 열기’에서 그 폴더를 열 수 있습니다.</p>
          <section aria-label="코드 링크를 추가할 폴더와 노트" className="public-paper mt-5 min-w-0 rounded-3xl p-5 text-[#29261f] sm:p-7">{form}</section>
        </div>
      </div>
    </main>
  );
}
