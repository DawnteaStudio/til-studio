import { describe, expect, it } from "vitest";
import { recommendSaveMode } from "@/lib/github/save";

describe("save mode recommendation", () => {
  it("quick-saves ordinary notes", () => {
    expect(recommendSaveMode(["cs/network/notes/book-network/network-layer.md"])).toBe("quick");
  });

  it("review-saves theory files", () => {
    expect(recommendSaveMode(["cs/network/theory/network-layer.md"])).toBe("review");
  });

  it("review-saves readme and structural changes", () => {
    expect(recommendSaveMode(["cs/network/README.md"])).toBe("review");
    expect(recommendSaveMode(["cs/network/notes/book-network/.keep"])).toBe("review");
  });
});
