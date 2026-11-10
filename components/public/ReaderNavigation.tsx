import Link from "next/link";

export function ReaderNavigation({ current }: { current?: "홈" | "글 목록" | "학습 지도" }) {
  return (
    <nav aria-label="주요 메뉴" className="public-nav flex-wrap rounded-2xl px-4 py-2 text-sm sm:rounded-full sm:px-5">
      <Link href="/" aria-current={current === "홈" ? "page" : undefined} className="py-2 font-bold text-white">til-studio</Link>
      <div className="flex flex-wrap items-center gap-1 text-[#d8d0bd]">
        {([["글 목록", "/blog"], ["학습 지도", "/map"], ["글쓰기", "/studio"]] as const).map(([label, href]) => (
          <Link key={href} href={href} aria-current={current === label ? "page" : undefined}
            className="rounded-full px-3 py-2 hover:bg-white/10 aria-[current=page]:bg-white/15 aria-[current=page]:text-white">
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
