import type { Metadata } from "next";
import { ReaderAccessProvider } from "@/components/public/ReaderAccessProvider";
import { getAdminIdentity } from "@/lib/auth/access";
import { isHostedMode } from "@/lib/auth/mode";
import { signOutAdmin } from "@/lib/auth/logout";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "학습 기록 · TIL", template: "%s · 학습 기록" },
  description: "공부하며 쓴 개발 노트와 개념 정리, 실습 코드를 함께 읽는 개인 학습 블로그.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const identity = await getAdminIdentity();
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ReaderAccessProvider canManage={Boolean(identity)} hosted={isHostedMode()} signOutAction={signOutAdmin}>
          {children}
        </ReaderAccessProvider>
      </body>
    </html>
  );
}
