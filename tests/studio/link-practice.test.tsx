import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LinkPracticeForm } from "@/components/studio/LinkPracticeForm";
import { LearningMap } from "@/components/public/LearningMap";
import type { ArchiveArticle, Practice } from "@/lib/content/archive";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const target = { owner: "example", repo: "Study", branch: "trunk" };
const path = "languages/c/notes/Workbook/note/pointers.md";
const props = { ...target, topic: "languages/c", source: "Workbook",
  notes: [{ path, title: "포인터 이해" }], practices: ["ch1", "ch2"], initialPractice: "ch2" };
const document = { ...target, path, sha: "first", content: "---\nsrc: [ch1]\n---\n# 포인터 이해" };
const tree = { ...target, allPaths: props.practices.map((slug) => `languages/c/notes/Workbook/src/${slug}/main.c`) };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); refresh.mockClear(); });

it("offers existing-note links only for practices with a note in the same source", () => {
  const article: ArchiveArticle = { path, title: "포인터 이해", area: "languages", topic: "c", source: "Workbook",
    kind: "note", created: null, updated: null, headings: [] };
  const practices: Practice[] = [
    { topicPath: "languages/c", source: "Workbook", slug: "ch2" },
    { topicPath: "languages/c", source: "다른 자료", slug: "ch3" },
  ];
  render(<LearningMap articles={[article]} practices={practices} roots={["languages"]} {...target} />);
  for (const summary of screen.getAllByText(/아직 노트와 연결되지 않은 실습/)) fireEvent.click(summary);
  expect(screen.getByRole("link", { name: "ch2 · 이미 쓴 노트에 코드 링크 추가" }).getAttribute("href"))
    .toBe("/studio/link-practice?topic=languages%2Fc&source=Workbook&practice=ch2");
  expect(screen.queryByRole("link", { name: "ch3 · 이미 쓴 노트에 코드 링크 추가" })).toBeNull();
  expect(screen.getByRole("link", { name: "ch3 · 이 실습으로 노트 쓰기" })).toBeTruthy();
});

it("rechecks the latest remote version after a conflict and sends only an attachment request", async () => {
  let reads = 0;
  let writes = 0;
  const fetcher = vi.fn<typeof fetch>(async (_url, options) => {
    if (_url === "/api/github/tree") return Response.json(tree);
    if (options?.method !== "POST") return Response.json({ ...document, sha: ++reads === 1 ? "first" : "second" });
    return ++writes === 1
      ? Response.json({ error: "저장소가 변경되었습니다." }, { status: 409 })
      : Response.json({ mode: "review", branch: "review/1", pullRequestUrl: "https://github.com/example/Study/pull/1" });
  });
  vi.stubGlobal("fetch", fetcher);
  render(<LinkPracticeForm {...props} />);
  expect(screen.getByRole("option", { name: /포인터 이해.*pointers\.md/ })).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "링크를 추가할 노트" }), { target: { value: path } });
  fireEvent.click(await screen.findByRole("radio", { name: "검토용 초안 PR 만들기" }));
  const save = screen.getByRole("button", { name: "GitHub에 저장" }) as HTMLButtonElement;
  await waitFor(() => expect(save.disabled).toBe(false));
  fireEvent.click(save);
  const retry = await screen.findByRole("button", { name: "최신 노트 다시 확인" });
  expect(save.disabled).toBe(true);
  expect(reads).toBe(1);
  fireEvent.click(retry);
  await waitFor(() => expect(save.disabled).toBe(false));
  expect(writes).toBe(1);
  fireEvent.click(save);
  const pr = await screen.findByRole("link", { name: "초안 PR 열기" });
  expect(pr.getAttribute("href")).toBe("https://github.com/example/Study/pull/1");
  expect(refresh).not.toHaveBeenCalled();
  const posts = fetcher.mock.calls.filter(([, options]) => options?.method === "POST");
  expect(posts[1][0]).toBe("/api/github/practice-link");
  expect(JSON.parse(String(posts[1][1]?.body))).toEqual({
    path, practice: "ch2", expected: { ...target, path, sha: "second" }, mode: "review",
  });
});

it("blocks a removed file and links an idempotent response to the existing article", async () => {
  let deleted = true;
  vi.stubGlobal("fetch", vi.fn<typeof fetch>(async (_url, options) => {
    if (_url === "/api/github/tree") return Response.json(tree);
    if (options?.method === "POST") return Response.json({ mode: "quick", branch: target.branch, alreadyLinked: true });
    return Response.json(deleted ? { ...document, sha: null, content: null } : document);
  }));
  render(<LinkPracticeForm {...props} />);
  fireEvent.change(screen.getByRole("combobox", { name: "링크를 추가할 노트" }), { target: { value: path } });
  await screen.findByRole("alert");
  const save = screen.getByRole("button", { name: "GitHub에 저장" }) as HTMLButtonElement;
  expect(save.disabled).toBe(true);
  deleted = false;
  fireEvent.click(screen.getByRole("button", { name: "최신 노트 다시 확인" }));
  await waitFor(() => expect(save.disabled).toBe(false));
  fireEvent.click(save);
  expect((await screen.findByRole("link", { name: "연결된 노트 열기" })).getAttribute("href")).toBe("/docs/" + path);
  expect(await screen.findByText("이 노트에 코드 폴더 링크가 이미 있습니다.")).toBeTruthy();
  expect(refresh).toHaveBeenCalledOnce();
  expect(screen.getByRole("link", { name: "갱신된 학습 지도 열기" }).getAttribute("href")).toBe("/map");
});

it("separates reserved names from effective links inferred from the note filename", async () => {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => Response.json({
    ...document, content: "---\nsrc: [future]\n---\n# 포인터 이해",
  })));
  render(<LinkPracticeForm {...props} practices={["pointers", "ch2"]} />);
  fireEvent.change(screen.getByRole("combobox", { name: "링크를 추가할 노트" }), { target: { value: path } });
  expect(await screen.findByText("현재 코드 링크 · pointers")).toBeTruthy();
  expect(screen.getByText("현재 코드 대기 · future")).toBeTruthy();
  expect(screen.getByText("저장 후 코드 링크 · pointers, ch2")).toBeTruthy();
  expect(screen.getByText("저장 후 코드 대기 · future")).toBeTruthy();
});

it("prevents retrying a deleted practice even when the note still exists", async () => {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>(async (url, options) => {
    if (url === "/api/github/tree") return Response.json({ ...tree, allPaths: tree.allPaths.slice(0, 1) });
    if (options?.method === "POST") return Response.json({ error: "저장소가 변경되었습니다." }, { status: 409 });
    return Response.json(document);
  }));
  render(<LinkPracticeForm {...props} />);
  fireEvent.change(screen.getByRole("combobox", { name: "링크를 추가할 노트" }), { target: { value: path } });
  const save = screen.getByRole("button", { name: "GitHub에 저장" }) as HTMLButtonElement;
  await waitFor(() => expect(save.disabled).toBe(false));
  fireEvent.click(save);
  fireEvent.click(await screen.findByRole("button", { name: "최신 노트 다시 확인" }));
  expect(await screen.findByText(/선택한 코드 폴더를 GitHub에서 찾을 수 없습니다/)).toBeTruthy();
  expect(save.disabled).toBe(true);
  expect(screen.queryByRole("option", { name: "ch2" })).toBeNull();
});
