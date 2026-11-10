import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TheoryResearchPanel, type TheoryResearchResult } from "@/components/studio/TheoryResearchPanel";

describe("TheoryResearchPanel", () => {
  it("researches a concept and only creates a draft after the user reviews the result", () => {
    const result: TheoryResearchResult = {
      title: "KMP Failure Function",
      concept: "KMP의 failure function은 패턴 내부의 접두사와 접미사 관계를 재사용하는 표입니다.",
      keyPoints: ["불일치 이후 비교 위치를 결정합니다.", "이미 확인한 문자를 다시 비교하지 않게 돕습니다."],
      cautions: ["인덱스 정의가 구현마다 다를 수 있습니다."],
      sources: [{ title: "KMP overview", url: "https://example.com/kmp" }],
    };
    const onResearch = vi.fn();
    const onKeywordChange = vi.fn();
    const onCreateDraft = vi.fn();
    const panel = (keyword: string, result: TheoryResearchResult | null) => (
      <TheoryResearchPanel
        keyword={keyword}
        result={result}
        isResearching={false}
        onKeywordChange={onKeywordChange}
        onResearch={onResearch}
        onCreateDraft={onCreateDraft}
      />
    );
    const { rerender } = render(panel("", null));

    expect(screen.queryByRole("button", { name: "Theory 초안 만들기" })).toBeNull();

    fireEvent.change(screen.getByLabelText("정리할 개념 키워드"), { target: { value: "KMP failure function" } });
    expect(onKeywordChange).toHaveBeenCalledWith("KMP failure function");

    rerender(panel("KMP failure function", null));
    fireEvent.click(screen.getByRole("button", { name: "웹에서 조사하기" }));
    expect(onResearch).toHaveBeenCalledWith("KMP failure function");
    rerender(panel("저장된 키워드", result));
    expect(screen.getByDisplayValue("저장된 키워드")).toBeTruthy();
    expect(screen.getByText("KMP Failure Function")).toBeTruthy();

    expect(onCreateDraft).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Theory 초안 만들기" }));

    expect(onCreateDraft).toHaveBeenCalledWith(result);
  });
});
