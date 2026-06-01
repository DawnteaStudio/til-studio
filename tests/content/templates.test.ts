import { describe, expect, it } from "vitest";
import { createNoteTemplate, createTheoryTemplate } from "@/lib/content/templates";

describe("Markdown templates", () => {
  it("creates a note template with parent navigation and table of contents", () => {
    const markdown = createNoteTemplate({
      title: "네트워크 계층을 공부하면서 헷갈린 점",
      source: "컴퓨터 네트워크 강의",
      parentHref: "../README.md",
      optionalSections: ["실험 결과"],
    });

    expect(markdown).toContain("[상위로 이동](../README.md)");
    expect(markdown).toContain("- [학습 출처](#학습-출처)");
    expect(markdown).toContain("## 헷갈린 점");
    expect(markdown).toContain("## 실험 결과");
    expect(markdown).toContain("컴퓨터 네트워크 강의");
  });

  it("creates a theory template linked to originating notes", () => {
    const markdown = createTheoryTemplate({
      title: "네트워크 계층",
      parentHref: "../README.md",
      relatedNotes: ["cs/network/notes/book-network/network-layer.md"],
    });

    expect(markdown).toContain("# 네트워크 계층");
    expect(markdown).toContain("## 개념");
    expect(markdown).toContain("## 관련 notes");
    expect(markdown).toContain("- [network-layer.md](../notes/book-network/network-layer.md)");
  });

  it("fills the theory template from reviewed research", () => {
    const markdown = createTheoryTemplate({
      title: "KMP Failure Function",
      parentHref: "../README.md",
      concept: "패턴 내부의 접두사와 접미사 관계를 재사용하는 표입니다.",
      keyPoints: ["불일치 이후 비교 위치를 결정합니다.", "이미 확인한 문자를 다시 비교하지 않게 돕습니다."],
      cautions: ["인덱스 정의가 구현마다 다를 수 있습니다."],
      sources: [{ title: "KMP overview", url: "https://example.com/kmp" }],
    });

    expect(markdown).toContain("## 개념\n\n패턴 내부의 접두사와 접미사 관계를 재사용하는 표입니다.");
    expect(markdown).toContain("## 핵심 내용\n\n- 불일치 이후 비교 위치를 결정합니다.");
    expect(markdown).toContain("## 주의할 점\n\n- 인덱스 정의가 구현마다 다를 수 있습니다.");
    expect(markdown).toContain("## 참고 자료\n\n- [KMP overview](https://example.com/kmp)");
  });
});
