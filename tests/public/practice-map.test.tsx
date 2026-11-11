import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MapPage from "@/app/map/page";
import { folderVisibilityStorageKey } from "@/lib/content/visibility";

const loadArchive = vi.hoisted(() => vi.fn());
vi.mock("@/components/public/reader-archive", () => ({ loadReaderArchive: loadArchive }));

const archive = {
  owner: "reader", repo: "TIL", branch: "main", roots: ["languages", "cs"],
  articles: [
    { path: "languages/c/notes/Book/note/intro.md", area: "languages", topic: "c", source: "Book", title: "첫 장", kind: "note" },
    { path: "cs/algorithms/notes/Hidden/note/one.md", area: "cs", topic: "algorithms", source: "Hidden", title: "숨긴 글", kind: "note" },
  ],
  practices: [
    { topicPath: "languages/c", source: "Book", slug: "exercise-2" },
    { topicPath: "languages/cpp", source: "Book", slug: "exercise-3" },
    { topicPath: "cs/algorithms", source: "Hidden", slug: "private-task" },
  ],
};

afterEach(() => { cleanup(); window.localStorage.clear(); loadArchive.mockReset(); });

it("opens a source-grouped list from the Studio query with the actions available for each practice", async () => {
  loadArchive.mockResolvedValue(archive);
  window.localStorage.setItem(folderVisibilityStorageKey, JSON.stringify(["languages"]));
  render(await MapPage({ searchParams: Promise.resolve({ view: "unlinked" }) }));
  expect(screen.getByRole("heading", { name: "GitHub에 올린 실습 찾기" })).toBeTruthy();
  const chapter = screen.getByText("exercise-2").closest("li")!;
  expect(chapter.closest("details")).toBeNull();
  expect(within(chapter).getByRole("link", { name: /이미 쓴 노트에 코드 링크 추가/ }).getAttribute("href"))
    .toBe("/studio/link-practice?topic=languages%2Fc&source=Book&practice=exercise-2");
  expect(within(chapter).getByRole("link", { name: /이 실습으로 노트 쓰기/ }).getAttribute("href"))
    .toBe("/studio?topic=languages%2Fc&source=Book&practice=exercise-2");
  const otherTopic = screen.getByText("exercise-3").closest("li")!;
  expect(within(otherTopic).queryByRole("link", { name: /이미 쓴 노트에 코드 링크 추가/ })).toBeNull();
  expect(within(otherTopic).getByRole("link", { name: /이 실습으로 노트 쓰기/ })).toBeTruthy();
  expect(screen.queryByText("private-task")).toBeNull();
  expect(screen.queryByText("첫 장")).toBeNull();
});

it("explains empty filtered results and offers a path to Studio", async () => {
  loadArchive.mockResolvedValue({ ...archive, practices: [archive.practices[2]] });
  window.localStorage.setItem(folderVisibilityStorageKey, JSON.stringify(["languages"]));
  render(await MapPage({ searchParams: Promise.resolve({ view: "unlinked" }) }));
  expect(screen.getByText(/공개한 자료에 아직 연결할 실습이 없습니다/)).toBeTruthy();
  expect(screen.getByText(/이미 연결한 실습/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Studio에서 노트 쓰기" }).getAttribute("href")).toBe("/studio");
  expect(screen.queryByText("private-task")).toBeNull();
});

it("keeps the full map as the default view", async () => {
  loadArchive.mockResolvedValue(archive);
  render(await MapPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("heading", { name: "학습 지도" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "첫 장" })).toBeTruthy();
  expect(screen.getByText("exercise-2").closest("details")?.open).toBe(false);
});

it("shows a recovery path instead of empty results when the GitHub read fails", async () => {
  loadArchive.mockRejectedValue(new Error("GitHub unavailable"));
  render(await MapPage({ searchParams: Promise.resolve({ view: "unlinked" }) }));
  expect(screen.getByRole("alert").textContent).toContain("GitHub에서 노트와 실습 목록을 불러오지 못했습니다.");
  expect(screen.queryByText(/공개한 자료에 아직 연결할 실습이 없습니다/)).toBeNull();
  expect(screen.getByRole("link", { name: "Studio로 돌아가기" }).getAttribute("href")).toBe("/studio");
});
