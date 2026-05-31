import { describe, expect, it } from "vitest";
import { searchTheory } from "@/lib/content/theory-index";
import type { IndexedDocument } from "@/lib/content/types";

const docs: IndexedDocument[] = [
  {
    path: "cs/spring/theory/transaction.md",
    title: "트랜잭션",
    kind: "theory",
    headings: ["롤백 기준", "주의할 점"],
    body: "Spring @Transactional rollbackFor checked exception RuntimeException",
    keywords: ["트랜잭션", "rollbackFor", "checked", "exception"],
  },
  {
    path: "cs/databases/theory/index.md",
    title: "인덱스",
    kind: "theory",
    headings: ["B-Tree"],
    body: "database index b-tree",
    keywords: ["인덱스", "database", "b-tree"],
  },
];

describe("theory index", () => {
  it("finds matching theory documents by editable query keywords", () => {
    const results = searchTheory(docs, ["transactional", "checked", "rollbackFor"]);
    expect(results[0]).toMatchObject({
      path: "cs/spring/theory/transaction.md",
      score: 3,
    });
  });

  it("searches title, headings, body, keywords, and path", () => {
    expect(searchTheory(docs, ["트랜잭션"])[0].path).toBe("cs/spring/theory/transaction.md");
    expect(searchTheory(docs, ["롤백"])[0].path).toBe("cs/spring/theory/transaction.md");
    expect(searchTheory(docs, ["RuntimeException"])[0].path).toBe("cs/spring/theory/transaction.md");
    expect(searchTheory(docs, ["databases"])[0].path).toBe("cs/databases/theory/index.md");
  });

  it("ignores non-theory documents", () => {
    const results = searchTheory(
      [
        ...docs,
        {
          path: "cs/spring/notes/db/transaction.md",
          title: "note",
          kind: "note",
          headings: [],
          body: "rollbackFor checked",
          keywords: ["rollbackFor", "checked"],
        },
      ],
      ["rollbackFor"],
    );

    expect(results.map((result) => result.path)).toEqual(["cs/spring/theory/transaction.md"]);
  });
});
