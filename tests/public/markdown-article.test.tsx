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

  it("keeps generated table of contents as anchor navigation", () => {
    render(<MarkdownArticle markdown={"## 목차\n\n- [개념](#개념)\n\n## 개념\n본문"} />);

    expect(screen.getByRole("link", { name: "개념" }).getAttribute("href")).toBe("#개념");
  });
});
