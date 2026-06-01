import { describe, expect, it } from "vitest";
import { resolveMarkdownImageUrl } from "@/lib/content/image-assets";

describe("markdown image assets", () => {
  const source = {
    owner: "DawnteaStudio",
    repo: "TIL",
    branch: "main",
    path: "cs/algorithms/theory/kmp.md",
  };

  it("resolves relative image paths beside the markdown file", () => {
    expect(resolveMarkdownImageUrl("kmp_images/idx0.png", source)).toBe(
      "https://raw.githubusercontent.com/DawnteaStudio/TIL/main/cs/algorithms/theory/kmp_images/idx0.png",
    );
  });

  it("keeps external and anchor image URLs unchanged", () => {
    expect(resolveMarkdownImageUrl("https://example.com/a.png", source)).toBe("https://example.com/a.png");
    expect(resolveMarkdownImageUrl("#diagram", source)).toBe("#diagram");
  });

  it("normalizes parent directory segments without escaping the repository", () => {
    expect(resolveMarkdownImageUrl("../shared/pic one.png", source)).toBe(
      "https://raw.githubusercontent.com/DawnteaStudio/TIL/main/cs/algorithms/shared/pic%20one.png",
    );
  });
});
