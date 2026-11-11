import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getAdminIdentity } from "@/lib/auth/access";
import { authConfigurationReady, safeAdminReturnTo } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

type Query = { callbackUrl?: string; error?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const returnTo = safeAdminReturnTo(query.callbackUrl);
  if (await getAdminIdentity()) redirect(returnTo);
  const configured = authConfigurationReady();
  return (
    <main className="public-shell flex min-h-screen items-center justify-center px-4 text-[#29261f]">
      <section className="public-paper w-full max-w-md space-y-5 rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold">관리자 로그인</h1>
        <p className="text-sm leading-6">블로그 글은 누구나 읽을 수 있습니다. 글 작성과 관리는 등록된 GitHub 계정으로 로그인하세요.</p>
        {configured ? <form action={async () => {
          "use server";
          if (!authConfigurationReady()) redirect("/login?error=Configuration");
          await signIn("github", { redirectTo: returnTo });
        }}>
          <button type="submit" className="min-h-12 w-full rounded-xl bg-[#204a78] px-4 py-3 font-semibold text-white">GitHub으로 로그인</button>
        </form> : <p role="status" className="rounded-xl bg-[#e8dfcd] p-3 text-sm">관리자 로그인 설정을 준비 중입니다.</p>}
        {query.error && configured && <p role="alert" className="text-sm text-[#932d28]">로그인하지 못했습니다. 등록된 관리자 GitHub 계정으로 다시 시도하세요.</p>}
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#204a78] underline">블로그로 돌아가기</Link>
      </section>
    </main>
  );
}
