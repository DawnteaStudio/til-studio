import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownArticle } from "@/components/public/MarkdownArticle";

describe("MarkdownArticle", () => {
  it("renders inline markdown instead of showing raw markers", () => {
    render(<MarkdownArticle markdown={"# 제목\n\n**강조**와 `코드`를 읽기 좋게 표시한다."} />);

    expect(screen.getByRole("heading", { name: "제목" })).toBeTruthy();
    expect(screen.getByText("강조")).toBeTruthy();
    expect(screen.queryByText("**강조**")).toBeNull();
  });

  it("cleans raw strong markers that appear inside Korean list text", () => {
    render(<MarkdownArticle markdown={"- 문장의 끝은 **세미콜론(;)**으로 마무리한다."} />);

    expect(screen.getByText("세미콜론(;)")).toBeTruthy();
    expect(screen.queryByText("**세미콜론(;)**")).toBeNull();
  });

  it("keeps generated table of contents as anchor navigation", () => {
    render(<MarkdownArticle markdown={"## 목차\n\n- [개념](#개념)\n\n## 개념\n본문"} />);

    expect(screen.getByRole("link", { name: "개념" }).getAttribute("href")).toBe("#개념");
  });

  it("renders GitHub flavored markdown tables", () => {
    render(
      <MarkdownArticle
        markdown={
          "| 이름 | 설명 |\n| --- | --- |\n| notes | 학습 기록 |\n| theory | 정리 문서 |"
        }
      />,
    );

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "이름" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "학습 기록" })).toBeTruthy();
  });

  it("does not drop sections after the table of contents", () => {
    render(
      <MarkdownArticle
        markdown={
          "## 목차\n\n- [참고자료](#참고자료)\n- [중간 내용](#중간-내용)\n\n## 참고자료\n본문 A\n\n## 중간 내용\n본문 B"
        }
      />,
    );

    expect(screen.getByRole("heading", { name: "참고자료" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "중간 내용" })).toBeTruthy();
    expect(screen.getByText("본문 B")).toBeTruthy();
  });

  it("uses GitHub-style ids for formatted headings", () => {
    render(<MarkdownArticle markdown={"### **1. C 프로그램의 기본 구조**\n본문"} />);

    expect(screen.getByRole("heading", { name: "1. C 프로그램의 기본 구조" }).id).toBe(
      "1-c-프로그램의-기본-구조",
    );
  });

  it("resolves article images from the markdown file directory", () => {
    render(
      <MarkdownArticle
        markdown={"![KMP table](kmp_images/idx0.png)"}
        imageSource={{
          owner: "DawnteaStudio",
          repo: "TIL",
          branch: "main",
          path: "cs/algorithms/theory/kmp.md",
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "KMP table" }).getAttribute("src")).toBe(
      "https://raw.githubusercontent.com/DawnteaStudio/TIL/main/cs/algorithms/theory/kmp_images/idx0.png",
    );
  });
});
