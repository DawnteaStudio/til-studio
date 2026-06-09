import { describe, expect, it } from "vitest";
import {
  buildNotePath,
  buildTheoryPath,
  makeSlug,
  parentReadmePath,
} from "@/lib/content/paths";

describe("content path helpers", () => {
  it("creates stable lowercase slugs", () => {
    expect(makeSlug("Network Layer 정리")).toBe("network-layer-정리");
    expect(makeSlug("BFS / DFS 메모")).toBe("bfs-dfs-메모");
  });

  it("builds topic-based note paths", () => {
    expect(
      buildNotePath({
        area: "cs",
        topic: "network",
        source: "book-network",
        title: "Network Layer 정리",
      }),
    ).toBe("cs/network/notes/book-network/note/network-layer-정리.md");
  });

  it("builds theory paths under the selected topic", () => {
    expect(
      buildTheoryPath({
        area: "cs",
        topic: "network",
        title: "Network Layer",
      }),
    ).toBe("cs/network/theory/network-layer.md");
  });

  it("points nested documents to the nearest README", () => {
    expect(parentReadmePath("cs/network/notes/book-network/note/network-layer.md")).toBe(
      "../README.md",
    );
    expect(parentReadmePath("cs/network/theory/network-layer.md")).toBe("../README.md");
  });
});
