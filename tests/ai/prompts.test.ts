import { describe, expect, it } from "vitest";
import { createNoteCleanupUserPrompt, noteCleanupSystemPrompt } from "@/lib/ai/prompts";

describe("AI prompts", () => {
  it("asks note drafting to write a reflective readable study article", () => {
    expect(noteCleanupSystemPrompt).toContain("학습 일지형 기술 글");
    expect(noteCleanupSystemPrompt).toContain("처음엔 이렇게 헷갈렸다");
    expect(noteCleanupSystemPrompt).toContain("일반적인 배경 설명을 보강");
    expect(noteCleanupSystemPrompt).toContain("확인할 점 섹션을 만들지 마세요");
    expect(noteCleanupSystemPrompt).toContain("Inpa");
    expect(noteCleanupSystemPrompt).toContain("헷갈린 점에 적힌 내용은 이해한 결론");
    expect(noteCleanupSystemPrompt).toContain("기술 블로그");
    expect(noteCleanupSystemPrompt).toContain("감상문이나 편지처럼");
    expect(noteCleanupSystemPrompt).toContain("담백한 개발 글");
    expect(noteCleanupSystemPrompt).toContain("짧은 문단");
    expect(noteCleanupSystemPrompt).toContain("참고자료가 실제로 있었을 때만");
    expect(noteCleanupSystemPrompt).toContain("사용자가 든 예시가 있다면 그 예시를 중심");
    expect(noteCleanupSystemPrompt).toContain("현재 이해한 결론");
    expect(noteCleanupSystemPrompt).toContain("헷갈린 점 섹션에는 혼란스러웠던 지점만");
    expect(noteCleanupSystemPrompt).toContain("오해나 막히는 질문에서 시작");
    expect(noteCleanupSystemPrompt).toContain("상황 예시");
    expect(noteCleanupSystemPrompt).toContain("전후 비교");
    expect(noteCleanupSystemPrompt).toContain("없음");
    expect(noteCleanupSystemPrompt).toContain("사용자가 직접 언급하지 않은");
    expect(noteCleanupSystemPrompt).toContain("섹션이 존재하지 않는 것으로 간주");
    expect(noteCleanupSystemPrompt).toContain("상상해서 만들지 마세요");
  });

  it("wraps note markdown with strict drafting and quality checks", () => {
    const prompt = createNoteCleanupUserPrompt(`# SOLID 원칙

## 헷갈린 점
개방 폐쇄의 원칙과 의존 역전의 법칙의 차이점이 헷갈렸다.
의존 역전에서 '역전'이라는 단어의 의미를 혼동했다.
`);

    expect(prompt).toContain("원본 메모를 그대로 복사하지 마세요");
    expect(prompt).toContain("헷갈린 점의 각 문장");
    expect(prompt).toContain("현재 이해한 결론");
    expect(prompt).toContain("의존 역전에서 '역전'이라는 단어의 의미를 혼동했다");
    expect(prompt).toContain("전후 비교");
    expect(prompt).toContain("코드 예시");
    expect(prompt).toContain("최종 제출 전에");
    expect(prompt).toContain("없음");
    expect(prompt).toContain("사용자가 제공한 내용에 근거");
    expect(prompt).toContain("현실적인 개발 상황을 새로 만들지 마세요");
    expect(prompt).toContain("편지처럼 쓰지 마세요");
    expect(prompt).toContain("기술적인 판단과 근거");
    expect(prompt).toContain("해당 섹션을 출력하지 마세요");
    expect(prompt).toContain("헷갈린 점이 `없음`이면");
    expect(prompt).toContain("확인하고 싶은 것이 `없음`이면");
  });
});
