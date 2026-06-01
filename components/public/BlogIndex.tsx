import Link from "next/link";
import { classifyPath } from "@/lib/content/indexer";
import type { ContentKind } from "@/lib/content/types";

interface BlogIndexProps {
  paths: string[];
  owner: string;
  repo: string;
}

interface BlogDocument {
  path: string;
  title: string;
  kind: ContentKind;
  area: string;
  topic: string;
}

const kindLabel: Record<ContentKind, string> = {
  note: "note",
  theory: "theory",
  readme: "guide",
  other: "doc",
};

export function BlogIndex({ paths, owner, repo }: BlogIndexProps) {
  const documents = paths.map(toBlogDocument).filter((doc) => doc.kind !== "other");
  const notes = documents.filter((doc) => doc.kind === "note");
  const theory = documents.filter((doc) => doc.kind === "theory");

  return (
    <main className="min-h-screen bg-[#151611] text-[#f4efe4]">
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <nav className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold">til-studio</Link>
          <div className="flex gap-3 text-sm text-[#cec4ae]">
            <Link href="/map" className="hover:text-[#f4efe4]">Map</Link>
            <Link href="/studio" className="hover:text-[#f4efe4]">Studio</Link>
          </div>
        </nav>

        <header className="grid gap-8 border-b border-[#34382b] pb-10 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9da88c]">
              {owner}/{repo}
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight text-[#f4efe4]">
              공부 기록을 블로그처럼 읽는 공간
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#c8bea8]">
              TIL 저장소의 notes와 theory를 실제 글 목록으로 보여줍니다. 파일 경로는 유지하되,
              화면에서는 포트폴리오와 학습 아카이브처럼 탐색할 수 있게 구성합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 self-end">
            <Metric label="all" value={documents.length} />
            <Metric label="notes" value={notes.length} />
            <Metric label="theory" value={theory.length} />
          </div>
        </header>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          {documents.map((document) => (
            <Link
              key={document.path}
              href={`/docs/${document.path}`}
              className="group rounded-[1.75rem] bg-[#24281e] p-5 transition hover:bg-[#2f3527]"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-[#d8c69a] px-3 py-1 text-xs font-semibold text-[#1e2118]">
                  {kindLabel[document.kind]}
                </span>
                <span className="font-mono text-xs text-[#9d957f]">
                  {document.area}/{document.topic}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-[#f4efe4] group-hover:text-[#f3d99a]">
                {document.title}
              </h2>
              <p className="mt-3 break-all font-mono text-xs leading-5 text-[#9d957f]">
                {document.path}
              </p>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-[#24281e] p-4 text-center">
      <p className="text-2xl font-semibold text-[#f4efe4]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9d957f]">{label}</p>
    </div>
  );
}

function toBlogDocument(path: string): BlogDocument {
  const segments = path.split("/");
  return {
    path,
    title: path.split("/").at(-1)?.replace(/\.md$/, "") ?? path,
    kind: classifyPath(path),
    area: segments[0] ?? "root",
    topic: segments[1] ?? "root",
  };
}
