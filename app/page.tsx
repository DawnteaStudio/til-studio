import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f5f1] px-6 py-10 text-zinc-950">
      <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dawntea TIL</h1>
        <Link href="/studio" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm text-white">
          Studio
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/map" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-zinc-950">Learning Map</h2>
          <p className="mt-2 text-sm text-zinc-600">
            GitHub TIL 레포 구조를 따라 공부 지도를 봅니다.
          </p>
        </Link>
        <Link href="/studio" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-zinc-950">Write Note</h2>
          <p className="mt-2 text-sm text-zinc-600">
            실제 TIL 저장소 위치를 선택하고 새 학습 기록을 작성합니다.
          </p>
        </Link>
      </div>
      </div>
    </main>
  );
}
