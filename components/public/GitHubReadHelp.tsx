import Link from "next/link";

export function GitHubReadHelp() {
  return (
    <div role="alert">
      <p className="font-semibold">GitHub에서 노트와 실습 목록을 불러오지 못했습니다.</p>
      <p className="mt-2 text-sm leading-6">잠시 뒤 페이지를 새로고침하세요. 처음 사용한다면 Studio의 톱니바퀴로 설정을 열고 GitHub 앱과 저장소를 확인하세요.</p>
      <Link href="/studio" className="mt-2 inline-flex min-h-11 items-center font-semibold text-[#204a78] underline underline-offset-4">Studio로 돌아가기</Link>
    </div>
  );
}
