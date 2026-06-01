import { describe, expect, it } from "vitest";
import { draftToNoteMarkdown } from "@/lib/content/note-draft";

describe("structured note draft", () => {
  it("turns friendly study fields into a notes markdown document", () => {
    const markdown = draftToNoteMarkdown({
      title: "@Transactional 롤백 기준",
      source: "인프런 김영한 스프링 DB 1편",
      learned: "RuntimeException은 기본 롤백 대상이다.",
      confused: "checked exception은 왜 기본 롤백 대상이 아닌지 헷갈렸다.",
      questions: "rollbackFor를 지정하면 checked exception도 롤백되는지 확인하고 싶다.",
      conclusion: "예외 종류와 rollbackFor 설정을 같이 봐야 한다.",
      experiments: "checked exception 테스트 코드를 작성해본다.",
      parentHref: "../README.md",
    });

    expect(markdown).toContain("[상위로 이동](../README.md)");
    expect(markdown).toContain("# @Transactional 롤백 기준");
    expect(markdown).toContain("## 학습 출처\n인프런 김영한 스프링 DB 1편");
    expect(markdown).toContain("## 오늘 배운 것\nRuntimeException은 기본 롤백 대상이다.");
    expect(markdown).toContain("## 헷갈린 점\nchecked exception은 왜 기본 롤백 대상이 아닌지 헷갈렸다.");
    expect(markdown).toContain("## 확인하고 싶은 것\nrollbackFor를 지정하면 checked exception도 롤백되는지 확인하고 싶다.");
    expect(markdown).toContain("## 현재 이해한 결론\n예외 종류와 rollbackFor 설정을 같이 봐야 한다.");
    expect(markdown).toContain("## 메모와 실험\nchecked exception 테스트 코드를 작성해본다.");
  });

  it("skips empty optional fields", () => {
    const markdown = draftToNoteMarkdown({
      title: "Promise를 공부하며 적은 내용",
      source: "MDN Promise 문서",
      learned: "Promise는 비동기 작업의 상태를 표현한다.",
      confused: "",
      questions: "",
      conclusion: "",
      experiments: "",
      parentHref: "../README.md",
    });

    expect(markdown).toContain("## 오늘 배운 것");
    expect(markdown).not.toContain("## 헷갈린 점");
    expect(markdown).not.toContain("## 확인하고 싶은 것");
  });
});
