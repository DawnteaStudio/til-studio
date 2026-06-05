import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudioWorkspace } from "@/components/studio/StudioWorkspace";

const treeResponse = {
  paths: [
    "cs/algorithms/README.md",
    "cs/algorithms/theory/kmp.md",
    "cs/algorithms/notes/APSS/ch6.md",
  ],
};

function mockFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/github/tree") {
      return Response.json(treeResponse);
    }
    if (url === "/api/ai/note-cleanup") {
      return Response.json({ markdown: "# Cleaned Note\n\n## 오늘 배운 것\nKMP" });
    }
    if (url === "/api/ai/theory-research") {
      return Response.json({
        title: "KMP 실패 함수",
        concept: "패턴 내부의 접두사와 접미사 관계를 재사용합니다.",
        keyPoints: ["불필요한 비교를 줄입니다."],
        cautions: ["인덱스 정의를 확인해야 합니다."],
        sources: [{ title: "KMP", url: "https://example.com/kmp" }],
      });
    }
    return Response.json({}, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("StudioWorkspace note and theory actions", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("guides required note fields before creating markdown", async () => {
    mockFetch();
    render(<StudioWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "글 초안 만들기" }));

    expect(await screen.findByText("작업 위치, 제목, 오늘 배운 것을 먼저 입력하세요")).toBeTruthy();
  });

  it("runs note drafting from 글 초안 만들기 after required fields are filled", async () => {
    const fetchMock = mockFetch();
    render(<StudioWorkspace />);

    await screen.findByText("algorithms");
    fireEvent.click(screen.getByText("algorithms").closest("button")!);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "KMP 정리" } });
    fireEvent.change(screen.getByLabelText("오늘 배운 것"), { target: { value: "KMP는 접두사 정보를 재사용한다." } });
    fireEvent.click(screen.getByRole("button", { name: "글 초안 만들기" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/ai/note-cleanup", expect.any(Object)));
    expect(await screen.findByText("글 초안 생성 완료")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "notes 형식으로 다듬기" })).toBeNull();
  });

  it("asks for a theory workspace before creating a theory draft", async () => {
    mockFetch();
    render(<StudioWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Theory" }));
    fireEvent.change(screen.getByLabelText("정리할 개념 키워드"), { target: { value: "KMP failure function" } });
    fireEvent.click(screen.getByRole("button", { name: "웹에서 조사하기" }));
    await screen.findByText("KMP 실패 함수");
    fireEvent.click(screen.getByRole("button", { name: "Theory 초안 만들기" }));

    expect(await screen.findByText("먼저 왼쪽에서 Theory를 저장할 area와 topic을 선택하세요")).toBeTruthy();
  });
});
