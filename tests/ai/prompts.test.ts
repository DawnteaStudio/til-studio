import { describe, expect, it } from "vitest";
import { noteCleanupSystemPrompt } from "@/lib/ai/prompts";

describe("AI prompts", () => {
  it("asks note drafting to write a reflective readable study article", () => {
    expect(noteCleanupSystemPrompt).toContain("학습 일지형 기술 글");
    expect(noteCleanupSystemPrompt).toContain("처음엔 이렇게 헷갈렸다");
    expect(noteCleanupSystemPrompt).toContain("일반적인 배경 설명을 보강");
    expect(noteCleanupSystemPrompt).toContain("확인할 점 섹션을 만들지 마세요");
    expect(noteCleanupSystemPrompt).toContain("Inpa");
  });
});
