"use client";

import Link from "next/link";
import { useReaderAccess } from "./ReaderAccessProvider";

export function ReaderNavigation({ current }: { current?: "홈" | "글 목록" | "학습 지도" }) {
  const { canManage, hosted, signOutAction } = useReaderAccess();
  return (
    <nav aria-label="주요 메뉴" className="public-nav flex-wrap rounded-2xl px-4 py-2 text-sm sm:rounded-full sm:px-5">
      <Link href="/" aria-current={current === "홈" ? "page" : undefined} className="py-2 font-bold text-white">학습 기록</Link>
      <div className="flex flex-wrap items-center gap-1 text-[#d8d0bd]">
        {([["글 목록", "/blog"], ["학습 지도", "/map"]] as const).map(([label, href]) => (
          <Link key={href} href={href} aria-current={current === label ? "page" : undefined}
            className="rounded-full px-3 py-2 hover:bg-white/10 aria-[current=page]:bg-white/15 aria-[current=page]:text-white">
            {label}
          </Link>
        ))}
        {canManage && <Link href="/studio" className="rounded-full px-3 py-2 hover:bg-white/10">Studio</Link>}
        {hosted && !canManage && <Link href="/login" className="rounded-full px-3 py-2 hover:bg-white/10">관리자 로그인</Link>}
        {hosted && canManage && signOutAction && <form action={signOutAction}>
          <button type="submit" className="rounded-full px-3 py-2 hover:bg-white/10">로그아웃</button>
        </form>}
      </div>
    </nav>
  );
}
