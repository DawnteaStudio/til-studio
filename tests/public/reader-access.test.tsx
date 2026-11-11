import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReaderAccessProvider, OwnerOnly } from "@/components/public/ReaderAccessProvider";
import { ReaderNavigation } from "@/components/public/ReaderNavigation";
import { LearningMap } from "@/components/public/LearningMap";

afterEach(cleanup);

it("offers public navigation and owner login without management controls", () => {
  render(<ReaderAccessProvider hosted canManage={false}>
    <ReaderNavigation /><OwnerOnly><button>노트 삭제</button></OwnerOnly>
  </ReaderAccessProvider>);
  expect(screen.getByRole("link", { name: "글 목록" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "관리자 로그인" }).getAttribute("href")).toBe("/login");
  expect(screen.queryByRole("link", { name: "Studio" })).toBeNull();
  expect(screen.queryByRole("button", { name: "노트 삭제" })).toBeNull();
});

it("shows Studio and sign-out controls to the hosted owner", () => {
  render(<ReaderAccessProvider hosted canManage signOutAction={vi.fn()}>
    <ReaderNavigation /><OwnerOnly><button>노트 삭제</button></OwnerOnly>
  </ReaderAccessProvider>);
  expect(screen.getByRole("link", { name: "Studio" }).getAttribute("href")).toBe("/studio");
  expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "노트 삭제" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "관리자 로그인" })).toBeNull();
});

it("keeps public code links while hiding the map writing flow even when its query is supplied", () => {
  const { container } = render(<ReaderAccessProvider hosted canManage={false}>
    <LearningMap owner="author" repo="TIL" branch="main" roots={["cs"]} articles={[]}
      practices={[{ topicPath: "cs/algorithms", source: "Book", slug: "one" }]} view="unlinked" />
  </ReaderAccessProvider>);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("학습 지도");
  const code = container.querySelector('a[href*="/src/one"]');
  expect(code?.getAttribute("href")).toBe("https://github.com/author/TIL/tree/main/cs/algorithms/notes/Book/src/one");
  expect(container.querySelector('a[href^="/studio"]')).toBeNull();
});
