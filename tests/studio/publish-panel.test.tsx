import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PublishPanel } from "@/components/studio/PublishPanel";

const path = "languages/c/theory/포인터.md";
const target = { owner: "example", repo: "TIL", branch: "trunk", path, sha: "blob", content: "공통\n기존 줄" };
const props = { path, content: "공통\n새로운 줄", mode: "quick" as const, showQuick: true, onModeChange: () => {} };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("shows the actual branch and changed text, and requires confirmation of this exact replacement", async () => {
  const fetcher = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) =>
    Response.json(options?.method === "POST" ? { mode: "quick", branch: "trunk", commitSha: "commit" } : target));
  vi.stubGlobal("fetch", fetcher);
  const view = render(<PublishPanel {...props} />);
  expect(await screen.findByText("trunk에 바로 저장")).toBeTruthy();
  expect(screen.getByText("기존 줄")).toBeTruthy();
  expect(screen.getByText("새로운 줄")).toBeTruthy();
  const save = screen.getByRole("button", { name: "GitHub에 저장" }) as HTMLButtonElement;
  expect(save.disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  view.rerender(<PublishPanel {...props} content="다시 바꿈" />);
  expect(save.disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(save);
  const link = await screen.findByRole("link", { name: "저장한 글 열기" });
  expect(decodeURI(link.getAttribute("href")!)).toBe("/docs/" + path);
  const post = fetcher.mock.calls.find(([, options]) => options?.method === "POST")![1]!;
  expect(JSON.parse(String(post.body))).toMatchObject({ expected: { path, sha: "blob", branch: "trunk" } });
});

it("refreshes a conflict and requires a new confirmation", async () => {
  let reads = 0;
  vi.stubGlobal("fetch", vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === "POST") return Response.json({ error: "최신 내용과 다시 비교하세요." }, { status: 409 });
    return Response.json(++reads === 1 ? { ...target, content: null, sha: null } : { ...target, content: "다른 사람이 쓴 줄" });
  }));
  render(<PublishPanel {...props} />);
  const save = screen.getByRole("button", { name: "GitHub에 저장" }) as HTMLButtonElement;
  await waitFor(() => expect(save.disabled).toBe(false));
  fireEvent.click(save);
  expect(await screen.findByText("다른 사람이 쓴 줄")).toBeTruthy();
  expect(save.disabled).toBe(true);
});

it("links a review save to its draft pull request", async () => {
  const url = "https://github.com/example/TIL/pull/9";
  vi.stubGlobal("fetch", vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => Response.json(
    options?.method === "POST" ? { mode: "review", branch: "til-studio/branch", pullRequestUrl: url } : { ...target, sha: null, content: null },
  )));
  render(<PublishPanel {...props} mode="review" showQuick={false} />);
  const save = screen.getByRole("button", { name: "GitHub에 저장" }) as HTMLButtonElement;
  await waitFor(() => expect(save.disabled).toBe(false));
  fireEvent.click(save);
  expect((await screen.findByRole("link", { name: "초안 PR 열기" })).getAttribute("href")).toBe(url);
  expect(screen.queryByRole("link", { name: "저장한 글 열기" })).toBeNull();
});
