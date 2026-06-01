import { describe, expect, it } from "vitest";
import { searchTheory } from "@/lib/content/theory-index";
import type { IndexedDocument } from "@/lib/content/types";

const docs: IndexedDocument[] = [
  {
    path: "cs/network/theory/network-layer.md",
    title: "네트워크 계층",
    kind: "theory",
    headings: ["라우팅", "주의할 점"],
    body: "network layer routing forwarding packet",
    keywords: ["네트워크", "라우팅", "forwarding", "packet"],
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
    const results = searchTheory(docs, ["network", "routing", "packet"]);
    expect(results[0]).toMatchObject({
      path: "cs/network/theory/network-layer.md",
      score: 3,
    });
  });

  it("searches title, headings, body, keywords, and path", () => {
    expect(searchTheory(docs, ["네트워크"])[0].path).toBe("cs/network/theory/network-layer.md");
    expect(searchTheory(docs, ["라우팅"])[0].path).toBe("cs/network/theory/network-layer.md");
    expect(searchTheory(docs, ["forwarding"])[0].path).toBe("cs/network/theory/network-layer.md");
    expect(searchTheory(docs, ["databases"])[0].path).toBe("cs/databases/theory/index.md");
  });

  it("ignores non-theory documents", () => {
    const results = searchTheory(
      [
        ...docs,
        {
          path: "cs/network/notes/book-network/network-layer.md",
          title: "note",
          kind: "note",
          headings: [],
          body: "routing forwarding",
          keywords: ["routing", "forwarding"],
        },
      ],
      ["routing"],
    );

    expect(results.map((result) => result.path)).toEqual(["cs/network/theory/network-layer.md"]);
  });
});
