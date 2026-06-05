import { describe, expect, it } from "vitest";
import { noteCleanupSystemPrompt } from "@/lib/ai/prompts";

describe("AI prompts", () => {
  it("asks note drafting to write a reflective readable study article", () => {
    expect(noteCleanupSystemPrompt).toContain("학습 일지형 기술 글");
    expect(noteCleanupSystemPrompt).toContain("처음엔 이렇게 헷갈렸다");
    expect(noteCleanupSystemPrompt).toContain("일반적인 배경 설명을 보강");
    expect(noteCleanupSystemPrompt).toContain("확인할 점 섹션을 만들지 마세요");
    expect(noteCleanupSystemPrompt).toContain("Inpa");
    expect(noteCleanupSystemPrompt).toContain("헷갈린 점에 적힌 내용은 이해한 결론");
    expect(noteCleanupSystemPrompt).toContain("습니다");
    expect(noteCleanupSystemPrompt).toContain("회고를 남기는 말투");
    expect(noteCleanupSystemPrompt).toContain("짧은 문단");
    expect(noteCleanupSystemPrompt).toContain("참고자료가 실제로 있었을 때만");
    expect(noteCleanupSystemPrompt).toContain("사용자가 든 예시가 있다면 그 예시를 중심");
  });
});
