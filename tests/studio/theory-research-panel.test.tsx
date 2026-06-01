import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TheoryResearchPanel } from "@/components/studio/TheoryResearchPanel";

describe("TheoryResearchPanel", () => {
  it("researches a concept and only creates a draft after the user reviews the result", async () => {
    const onResearch = vi.fn().mockResolvedValue({
      title: "KMP Failure Function",
      concept: "KMP의 failure function은 패턴 내부의 접두사와 접미사 관계를 재사용하는 표입니다.",
      keyPoints: ["불일치 이후 비교 위치를 결정합니다.", "이미 확인한 문자를 다시 비교하지 않게 돕습니다."],
      cautions: ["인덱스 정의가 구현마다 다를 수 있습니다."],
      sources: [{ title: "KMP overview", url: "https://example.com/kmp" }],
    });
    const onCreateDraft = vi.fn();

    render(
      <TheoryResearchPanel
        keyword=""
        result={null}
        isResearching={false}
        onKeywordChange={vi.fn()}
        onResearch={onResearch}
        onCreateDraft={onCreateDraft}
      />,
    );

    expect(screen.queryByRole("button", { name: "Theory 초안 만들기" })).toBeNull();

    fireEvent.change(screen.getByLabelText("정리할 개념 키워드"), { target: { value: "KMP failure function" } });
    fireEvent.click(screen.getByRole("button", { name: "웹에서 조사하기" }));
    await screen.findByText("KMP Failure Function");

    expect(onCreateDraft).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Theory 초안 만들기" }));

    expect(onCreateDraft).toHaveBeenCalledWith({
      title: "KMP Failure Function",
      concept: "KMP의 failure function은 패턴 내부의 접두사와 접미사 관계를 재사용하는 표입니다.",
      keyPoints: ["불일치 이후 비교 위치를 결정합니다.", "이미 확인한 문자를 다시 비교하지 않게 돕습니다."],
      cautions: ["인덱스 정의가 구현마다 다를 수 있습니다."],
      sources: [{ title: "KMP overview", url: "https://example.com/kmp" }],
    });
  });
});
