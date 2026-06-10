import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentView } from "@/components/public/DocumentView";
import { NoteDeleteControl } from "@/components/public/NoteDeleteControl";

const router = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

describe("note deletion controls", () => {
  beforeEach(() => {
    router.push.mockReset();
    router.refresh.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the delete action only for note documents", () => {
    const base = {
      title: "Test",
      headings: [],
      body: "# Test",
      keywords: [],
      owner: "example",
      repo: "repo",
      branch: "main",
    };
    const { rerender } = render(
      <DocumentView
        document={{
          ...base,
          path: "languages/java/notes/java-intro/note/test.md",
          kind: "note",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "글 삭제" })).toBeTruthy();

    rerender(
      <DocumentView
        document={{
          ...base,
          path: "languages/java/theory/test.md",
          kind: "theory",
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "글 삭제" })).toBeNull();
  });

  it("opens with Review selected and cancels without a request", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <NoteDeleteControl
        title="Test note"
        path="languages/java/notes/java-intro/note/test.md"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "글 삭제" }));

    expect(screen.getByRole("dialog", { name: "글 삭제" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByText("Test note")).toBeTruthy();
    expect(
      screen.getByText("관련 README 목록도 함께 업데이트됩니다."),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog", { name: "글 삭제" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits Review deletion and displays the pull request link", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        mode: "review",
        branch: "til-studio/delete",
        pullRequestUrl: "https://github.com/example/repo/pull/1",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <NoteDeleteControl
        title="Test note"
        path="languages/java/notes/java-intro/note/test.md"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "글 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 요청" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/github/delete",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body).toEqual({
      mode: "review",
      path: "languages/java/notes/java-intro/note/test.md",
      message: "Delete TIL note from til-studio",
    });
    expect(
      (await screen.findByRole("link", { name: "Draft PR 열기" })).getAttribute(
        "href",
      ),
    ).toBe("https://github.com/example/repo/pull/1");
  });

  it("submits Quick deletion and returns to the blog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          mode: "quick",
          branch: "main",
          commitSha: "abc123",
        }),
      ),
    );
    render(
      <NoteDeleteControl
        title="Test note"
        path="languages/java/notes/java-intro/note/test.md"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "글 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "Quick" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 요청" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/blog"));
    expect(router.refresh).toHaveBeenCalled();
  });
});
