import { describe, expect, it } from "vitest";
import { shouldIndexMarkdownPath } from "@/lib/github/repository";

describe("repository markdown indexing", () => {
  it("excludes template markdown from public and studio indexes", () => {
    expect(shouldIndexMarkdownPath("templates/note.md")).toBe(false);
    expect(shouldIndexMarkdownPath("cs/network/notes/book-network/network-layer.md")).toBe(true);
  });
});
