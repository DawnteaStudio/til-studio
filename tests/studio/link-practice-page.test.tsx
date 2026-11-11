import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import LinkPracticePage from "@/app/studio/link-practice/page";

const source = "languages/c/notes/Workbook";
const task = "실습 (2)";
const archive = vi.hoisted(() => vi.fn());
vi.mock("@/lib/github/archive", () => ({ fetchRepositoryArchive: archive }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => { cleanup(); archive.mockReset(); });

it("offers only actual notes and practices directly under the selected GitHub source", async () => {
  const valid = `${source}/note/pointers.md`;
  archive.mockResolvedValue({
    owner: "example", repo: "Study", branch: "trunk",
    articles: [
      { kind: "note", path: valid, title: "포인터" },
      { kind: "note", path: `${source}/src/설명.md`, title: "실습 부속 문서" },
      { kind: "note", path: `${source}/note/README.md`, title: "폴더 소개" },
      { kind: "note", path: "languages/c/notes/Other/note/pointers.md", title: "다른 책" },
    ],
    allPaths: [valid, `${source}/src/${task}/main.c`, `${source}/src/빈 폴더/.gitkeep`],
  });
  render(await LinkPracticePage({ searchParams: Promise.resolve({ topic: "languages/c", source: "Workbook", practice: task }) }));
  expect(screen.getByRole("heading", { name: "이미 쓴 노트에 코드 링크 추가", level: 1 })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "링크를 추가할 노트" })).toBeTruthy();
  expect((screen.getByRole("combobox", { name: "GitHub에 올린 코드 폴더" }) as HTMLSelectElement).value).toBe(task);
  expect(screen.getByRole("option", { name: /포인터 · pointers.md/ })).toBeTruthy();
  expect(screen.queryByRole("option", { name: /다른 책|실습 부속 문서|폴더 소개|빈 폴더/ })).toBeNull();
});

it("offers a way back to the source when a previously linked practice disappears", async () => {
  archive.mockResolvedValue({
    owner: "example", repo: "Study", branch: "trunk",
    articles: [{ kind: "note", path: `${source}/note/first.md`, title: "첫 노트" }],
    allPaths: [`${source}/src/current/task.c`],
  });
  render(await LinkPracticePage({ searchParams: Promise.resolve({ topic: "languages/c", source: "Workbook", practice: "removed" }) }));
  expect(screen.getByRole("alert").textContent).toContain("찾을 수 없습니다");
  expect(screen.getByRole("link", { name: "다른 코드 폴더 선택" }).getAttribute("href"))
    .toBe("/studio/link-practice?topic=languages%2Fc&source=Workbook");
  expect(screen.queryByRole("button", { name: "GitHub에 저장" })).toBeNull();
});

it("lets the user create a note for the selected practice if the last existing note is removed", async () => {
  archive.mockResolvedValue({ articles: [], allPaths: [`${source}/src/${task}/main.c`] });
  render(await LinkPracticePage({ searchParams: Promise.resolve({ topic: "languages/c", source: "Workbook", practice: task }) }));
  expect(screen.getByRole("status").textContent).toContain("GitHub에 저장한 노트가 없습니다");
  expect(screen.getByRole("link", { name: "이 실습으로 노트 쓰기" }).getAttribute("href"))
    .toBe("/studio?" + new URLSearchParams({ topic: "languages/c", source: "Workbook", practice: task }));
  expect(screen.getByRole("link", { name: "연결할 실습 목록으로" }).getAttribute("href")).toBe("/map?view=unlinked");
});
