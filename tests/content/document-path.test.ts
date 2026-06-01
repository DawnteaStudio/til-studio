import { describe, expect, it } from "vitest";
import { documentPathCandidates } from "@/lib/content/document-path";

describe("document path candidates", () => {
  it("resolves folder docs through README first", () => {
    expect(documentPathCandidates("cs/algorithms")).toEqual([
      "cs/algorithms/README.md",
      "cs/algorithms.md",
    ]);
  });

  it("keeps markdown file paths unchanged", () => {
    expect(documentPathCandidates("languages/c/notes/hongongC/note/ch2.md")).toEqual([
      "languages/c/notes/hongongC/note/ch2.md",
    ]);
  });
});
