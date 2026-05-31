import { describe, expect, it } from "vitest";
import { createNoteTemplate, createTheoryTemplate } from "@/lib/content/templates";

describe("Markdown templates", () => {
  it("creates a note template with parent navigation and table of contents", () => {
    const markdown = createNoteTemplate({
      title: "@Transactional 롤백 기준을 공부하면서 헷갈린 점",
      source: "인프런 김영한 스프링 DB 1편",
      parentHref: "../README.md",
      optionalSections: ["실험 결과"],
    });

    expect(markdown).toContain("[상위로 이동](../README.md)");
    expect(markdown).toContain("- [학습 출처](#학습-출처)");
    expect(markdown).toContain("## 헷갈린 점");
    expect(markdown).toContain("## 실험 결과");
    expect(markdown).toContain("인프런 김영한 스프링 DB 1편");
  });

  it("creates a theory template linked to originating notes", () => {
    const markdown = createTheoryTemplate({
      title: "트랜잭션",
      parentHref: "../README.md",
      relatedNotes: ["cs/spring/notes/inflearn-spring-db/transactional-rollback.md"],
    });

    expect(markdown).toContain("# 트랜잭션");
    expect(markdown).toContain("## 개념");
    expect(markdown).toContain("## 관련 notes");
    expect(markdown).toContain("- [transactional-rollback.md](../notes/inflearn-spring-db/transactional-rollback.md)");
  });
});
