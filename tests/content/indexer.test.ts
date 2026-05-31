import { describe, expect, it } from "vitest";
import { classifyPath, indexMarkdownDocument, treeFromPaths } from "@/lib/content/indexer";

describe("content indexer", () => {
  it("classifies notes, theory, readmes, and coding-test separately", () => {
    expect(classifyPath("cs/spring/notes/db/transaction.md")).toBe("note");
    expect(classifyPath("cs/spring/theory/transaction.md")).toBe("theory");
    expect(classifyPath("cs/spring/README.md")).toBe("readme");
    expect(classifyPath("coding-test/programmers/a.md")).toBe("other");
  });

  it("extracts title and headings from Markdown", () => {
    const doc = indexMarkdownDocument({
      path: "cs/spring/theory/transaction.md",
      body: "# 트랜잭션\n\n## 개념\n\n본문\n\n## 주의할 점\n",
    });

    expect(doc.title).toBe("트랜잭션");
    expect(doc.kind).toBe("theory");
    expect(doc.headings).toEqual(["개념", "주의할 점"]);
    expect(doc.keywords).toContain("트랜잭션");
  });

  it("builds a nested tree from repository paths", () => {
    const tree = treeFromPaths([
      "cs/spring/README.md",
      "cs/spring/notes/db/transaction.md",
      "cs/spring/theory/transaction.md",
      "coding-test/programmers/problem.md",
    ]);

    expect(tree.children?.map((node) => node.name)).toEqual(["coding-test", "cs"]);
    const cs = tree.children?.find((node) => node.name === "cs");
    expect(cs?.children?.[0]?.name).toBe("spring");
  });
});
