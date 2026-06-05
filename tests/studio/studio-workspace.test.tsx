import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

describe("StudioWorkspace note and theory actions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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
    expect(await screen.findByRole("status", { name: "글 초안 생성 완료" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Cleaned Note" })).toBeTruthy();
    expect(screen.queryByDisplayValue(/# Cleaned Note/)).toBeNull();
    expect(screen.queryByRole("button", { name: "notes 형식으로 다듬기" })).toBeNull();
  });

  it("switches between rendered preview and markdown source editing", async () => {
    mockFetch();
    render(<StudioWorkspace />);

    await screen.findByText("algorithms");
    fireEvent.click(screen.getByText("algorithms").closest("button")!);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "KMP 정리" } });
    fireEvent.change(screen.getByLabelText("오늘 배운 것"), { target: { value: "KMP는 접두사 정보를 재사용한다." } });
    fireEvent.click(screen.getByRole("button", { name: "글 초안 만들기" }));

    expect(await screen.findByRole("heading", { name: "Cleaned Note" })).toBeTruthy();
    expect(screen.queryByDisplayValue(/# Cleaned Note/)).toBeNull();

    fireEvent.click(screen.getByLabelText("Markdown 직접 수정"));

    expect(screen.getByDisplayValue(/# Cleaned Note/)).toBeTruthy();
  });

  it("guides source folder selection in the center workspace", async () => {
    mockFetch();
    render(<StudioWorkspace />);

    expect(await screen.findByText("먼저 topic을 선택하면 source 폴더를 고를 수 있습니다.")).toBeTruthy();

    fireEvent.click(screen.getByText("algorithms").closest("button")!);

    expect(screen.getByRole("heading", { name: "저장 source 폴더" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "APSS" }));
    expect(screen.getByText("선택된 source: APSS")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("새 source 이름"), { target: { value: "Software Maestro" } });
    expect(screen.getByText("저장 폴더: software-maestro")).toBeTruthy();
  });

  it("shows themed progress and completion notices while drafting a note", async () => {
    const noteResponse = deferred<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/github/tree") return Response.json(treeResponse);
        if (url === "/api/ai/note-cleanup") return noteResponse.promise;
        return Response.json({}, { status: 404 });
      }),
    );
    render(<StudioWorkspace />);

    await screen.findByText("algorithms");
    fireEvent.click(screen.getByText("algorithms").closest("button")!);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "KMP 정리" } });
    fireEvent.change(screen.getByLabelText("오늘 배운 것"), { target: { value: "KMP는 접두사 정보를 재사용한다." } });
    fireEvent.click(screen.getByRole("button", { name: "글 초안 만들기" }));

    expect(await screen.findByRole("status", { name: "글 초안 생성 중" })).toBeTruthy();
    expect(screen.getByText("AI가 메모를 학습 글로 다듬는 중입니다")).toBeTruthy();

    noteResponse.resolve(Response.json({ markdown: "# Cleaned Note\n\n## 오늘 배운 것\nKMP" }));

    expect(await screen.findByRole("status", { name: "글 초안 생성 완료" })).toBeTruthy();
    expect(screen.getByText("초안이 완성되었습니다. 미리보기에서 확인하세요.")).toBeTruthy();
  });

  it("lets completion notices be dismissed and hides them automatically", async () => {
    mockFetch();
    render(<StudioWorkspace />);

    await screen.findByText("algorithms");
    fireEvent.click(screen.getByText("algorithms").closest("button")!);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "KMP 정리" } });
    fireEvent.change(screen.getByLabelText("오늘 배운 것"), { target: { value: "KMP는 접두사 정보를 재사용한다." } });
    fireEvent.click(screen.getByRole("button", { name: "글 초안 만들기" }));

    expect(await screen.findByRole("status", { name: "글 초안 생성 완료" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "알림 닫기" }));
    expect(screen.queryByRole("status", { name: "글 초안 생성 완료" })).toBeNull();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "글 초안 만들기" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("status", { name: "글 초안 생성 완료" })).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.queryByRole("status", { name: "글 초안 생성 완료" })).toBeNull();
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

  it("shows a themed notice when saving cannot build a path", async () => {
    mockFetch();
    render(<StudioWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "GitHub에 저장" }));

    expect(await screen.findByRole("status", { name: "저장할 수 없습니다" })).toBeTruthy();
    expect(screen.getByText("저장할 경로를 만들 수 없습니다. 작업 위치, 출처, 제목을 확인하세요.")).toBeTruthy();
  });

  it("shows progress and failure notices for GitHub save requests", async () => {
    const saveResponse = deferred<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/github/tree") return Response.json(treeResponse);
        if (url === "/api/github/save") return saveResponse.promise;
        return Response.json({}, { status: 404 });
      }),
    );
    render(<StudioWorkspace />);

    await screen.findByText("algorithms");
    fireEvent.click(screen.getByText("algorithms").closest("button")!);
    fireEvent.click(screen.getByText("APSS").closest("button")!);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "KMP 정리" } });
    fireEvent.change(screen.getByLabelText("오늘 배운 것"), { target: { value: "KMP는 접두사 정보를 재사용한다." } });
    fireEvent.click(screen.getByRole("button", { name: "GitHub에 저장" }));

    expect(await screen.findByRole("status", { name: "GitHub 저장 중" })).toBeTruthy();

    saveResponse.resolve(Response.json({ error: "save failed" }, { status: 500 }));

    expect(await screen.findByRole("status", { name: "GitHub 저장 실패" })).toBeTruthy();
    expect(screen.getByText("GitHub 저장 요청이 실패했습니다. 설정과 권한을 확인하세요.")).toBeTruthy();
  });

  it("shows a completion notice after a successful GitHub save", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/github/tree") return Response.json(treeResponse);
      if (url === "/api/github/save") return Response.json({ mode: "quick", commitSha: "abc123" });
      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<StudioWorkspace />);

    await screen.findByText("algorithms");
    fireEvent.click(screen.getByText("algorithms").closest("button")!);
    fireEvent.click(screen.getByText("APSS").closest("button")!);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "KMP 정리" } });
    fireEvent.change(screen.getByLabelText("오늘 배운 것"), { target: { value: "KMP는 접두사 정보를 재사용한다." } });
    fireEvent.click(screen.getByRole("button", { name: "GitHub에 저장" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/github/save", expect.any(Object)));
    expect(await screen.findByRole("status", { name: "GitHub 저장 완료" })).toBeTruthy();
    expect(screen.getByText("GitHub에 바로 저장되었습니다.")).toBeTruthy();
  });
});
