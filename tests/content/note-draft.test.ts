import { describe, expect, it } from "vitest";
import { draftToNoteMarkdown } from "@/lib/content/note-draft";

describe("structured note draft", () => {
  it("turns friendly study fields into a notes markdown document", () => {
    const markdown = draftToNoteMarkdown({
      title: "네트워크 계층 정리",
      source: "컴퓨터 네트워크 강의",
      learned: "네트워크 계층은 서로 다른 네트워크 사이의 패킷 전달을 담당한다.",
      confused: "라우팅과 포워딩의 차이가 헷갈렸다.",
      questions: "라우터가 경로를 선택하는 과정을 더 확인하고 싶다.",
      conclusion: "라우팅은 경로 결정, 포워딩은 실제 전달에 가깝다.",
      experiments: "간단한 traceroute 결과를 비교해본다.",
      parentHref: "../README.md",
    });

    expect(markdown).toContain("[상위로 이동](../README.md)");
    expect(markdown).toContain("# 네트워크 계층 정리");
    expect(markdown).toContain("## 학습 출처\n컴퓨터 네트워크 강의");
    expect(markdown).toContain("## 오늘 배운 것\n네트워크 계층은 서로 다른 네트워크 사이의 패킷 전달을 담당한다.");
    expect(markdown).toContain("## 헷갈린 점\n라우팅과 포워딩의 차이가 헷갈렸다.");
    expect(markdown).toContain("## 확인하고 싶은 것\n라우터가 경로를 선택하는 과정을 더 확인하고 싶다.");
    expect(markdown).toContain("## 현재 이해한 결론\n라우팅은 경로 결정, 포워딩은 실제 전달에 가깝다.");
    expect(markdown).toContain("## 메모와 실험\n간단한 traceroute 결과를 비교해본다.");
  });

  it("skips empty optional fields", () => {
    const markdown = draftToNoteMarkdown({
      title: "정렬 알고리즘 메모",
      source: "알고리즘 책",
      learned: "정렬 알고리즘은 입력 데이터를 특정 기준에 따라 재배치한다.",
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
