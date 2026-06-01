import { describe, expect, it } from "vitest";
import { buildFolderNav, filterPathsByFolder } from "@/lib/content/folder-tree";

describe("folder navigation", () => {
  const paths = [
    "cs/algorithms/theory/KMP.md",
    "cs/algorithms/notes/APSS/ch1.md",
    "languages/c/notes/hongongC/note/ch2.md",
  ];

  it("builds nested folder counts from article paths", () => {
    const [cs] = buildFolderNav(paths);

    expect(cs.name).toBe("cs");
    expect(cs.documentCount).toBe(2);
    expect(cs.children[0].path).toBe("cs/algorithms");
    expect(cs.children[0].documentCount).toBe(2);
  });

  it("filters documents by selected folder prefix", () => {
    expect(filterPathsByFolder(paths, "languages/c")).toEqual([
      "languages/c/notes/hongongC/note/ch2.md",
    ]);
  });
});
