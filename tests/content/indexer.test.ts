import { describe, expect, it } from "vitest";
import { classifyPath, indexMarkdownDocument, treeFromPaths } from "@/lib/content/indexer";

describe("content indexer", () => {
  it("classifies notes, theory, readmes, and coding-test separately", () => {
    expect(classifyPath("cs/network/notes/book-network/network-layer.md")).toBe("note");
    expect(classifyPath("cs/network/theory/network-layer.md")).toBe("theory");
    expect(classifyPath("cs/network/README.md")).toBe("readme");
    expect(classifyPath("coding-test/programmers/a.md")).toBe("other");
  });

  it("extracts title and headings from Markdown", () => {
    const doc = indexMarkdownDocument({
      path: "cs/network/theory/network-layer.md",
      body: "# 네트워크 계층\n\n## 개념\n\n본문\n\n## 주의할 점\n",
    });

    expect(doc.title).toBe("네트워크 계층");
    expect(doc.kind).toBe("theory");
    expect(doc.headings).toEqual(["개념", "주의할 점"]);
    expect(doc.keywords).toContain("네트워크");
  });

  it("builds a nested tree from repository paths", () => {
    const tree = treeFromPaths([
      "cs/network/README.md",
      "cs/network/notes/book-network/network-layer.md",
      "cs/network/theory/network-layer.md",
      "coding-test/programmers/problem.md",
    ]);

    expect(tree.children?.map((node) => node.name)).toEqual(["coding-test", "cs"]);
    const cs = tree.children?.find((node) => node.name === "cs");
    expect(cs?.children?.[0]?.name).toBe("network");
  });
});
