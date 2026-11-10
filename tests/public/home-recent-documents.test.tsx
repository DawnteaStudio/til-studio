import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HomeRecentDocuments } from "@/components/public/HomeRecentDocuments";
import { folderVisibilityStorageKey } from "@/lib/content/visibility";
import type { ArchiveArticle } from "@/lib/content/archive";

const articles: ArchiveArticle[] = [
  { path: "cs/network/theory/layers.md", title: "네트워크 계층", area: "cs", topic: "network", source: null,
    kind: "theory", created: "2025-07-02", updated: null, headings: [] },
  { path: "languages/c/notes/book/note/ch2.md", title: "포인터 복습", area: "languages", topic: "c", source: "book",
    kind: "note", created: "2025-06-01", updated: "2025-08-02", headings: [] },
  { path: "languages/c/notes/book/note/ch1.md", title: "C 기초", area: "languages", topic: "c", source: "book",
    kind: "note", created: null, updated: null, headings: [] },
];
const paths = articles.map((article) => article.path);

describe("home article feed", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows actual titles with dated changes first and undated articles last", () => {
    render(<HomeRecentDocuments articles={articles} paths={paths} />);
    const rows = within(screen.getByRole("list", { name: "최근 기록" })).getAllByRole("listitem");
    expect(rows.map((row) => within(row).getByRole("link").textContent)).toEqual([
      "네트워크 계층", "포인터 복습", "C 기초",
    ]);
    expect(rows[1].querySelector("time")?.dateTime).toBe("2025-06-01");
    expect(rows[1].textContent).toContain("2장");
    expect(rows[2].querySelector("time")).toBeNull();
  });

  it("uses the same visible articles for totals and recent records", () => {
    window.localStorage.setItem(folderVisibilityStorageKey, JSON.stringify(["cs"]));
    render(<HomeRecentDocuments articles={articles} paths={paths} />);
    expect(screen.getByRole("link", { name: "네트워크 계층" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "포인터 복습" })).toBeNull();
    expect(screen.getByText("전체 1편")).toBeTruthy();
    expect(screen.getByText("학습 노트 0편")).toBeTruthy();
    expect(screen.getByText("개념 정리 1편")).toBeTruthy();
  });
});
