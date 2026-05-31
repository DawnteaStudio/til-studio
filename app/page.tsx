import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-zinc-950">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dawntea TIL</h1>
        <Link href="/studio" className="rounded bg-zinc-950 px-3 py-2 text-sm text-white">
          Studio
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/map" className="rounded border border-zinc-200 bg-white p-5">
          <h2 className="font-medium text-zinc-950">Learning Map</h2>
          <p className="mt-2 text-sm text-zinc-600">
            GitHub TIL 레포 구조를 따라 공부 지도를 봅니다.
          </p>
        </Link>
        <Link
          href="/docs/cs/spring/notes/inflearn-spring-db/transactional-rollback.md"
          className="rounded border border-zinc-200 bg-white p-5"
        >
          <h2 className="font-medium text-zinc-950">Recent Note</h2>
          <p className="mt-2 text-sm text-zinc-600">
            notes와 theory 문서를 공개 블로그처럼 읽습니다.
          </p>
        </Link>
      </div>
    </main>
  );
}
