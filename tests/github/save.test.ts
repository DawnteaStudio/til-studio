import { describe, expect, it } from "vitest";
import { recommendSaveMode } from "@/lib/github/save";

describe("save mode recommendation", () => {
  it("quick-saves ordinary notes", () => {
    expect(recommendSaveMode(["cs/spring/notes/db/transaction.md"])).toBe("quick");
  });

  it("review-saves theory files", () => {
    expect(recommendSaveMode(["cs/spring/theory/transaction.md"])).toBe("review");
  });

  it("review-saves readme and structural changes", () => {
    expect(recommendSaveMode(["cs/spring/README.md"])).toBe("review");
    expect(recommendSaveMode(["cs/spring/notes/new-course/.keep"])).toBe("review");
  });
});
