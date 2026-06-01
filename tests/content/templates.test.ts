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
});
