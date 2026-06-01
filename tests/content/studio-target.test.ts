import { describe, expect, it } from "vitest";
import { deriveStudyTarget } from "@/lib/content/studio-target";

describe("studio target derivation", () => {
  it("derives an area and topic from topic-level folders", () => {
    expect(deriveStudyTarget("cs/algorithms")).toEqual({
      area: "cs",
      topic: "algorithms",
    });
    expect(deriveStudyTarget("languages/javascript")).toEqual({
      area: "languages",
      topic: "javascript",
    });
  });

  it("keeps the topic stable when a nested folder is selected", () => {
    expect(deriveStudyTarget("cs/algorithms/notes/APSS")).toEqual({
      area: "cs",
      topic: "algorithms",
    });
  });

  it("rejects top-level, coding-test, and unknown paths", () => {
    expect(deriveStudyTarget("cs")).toBeNull();
    expect(deriveStudyTarget("coding-test/code_tree")).toBeNull();
    expect(deriveStudyTarget("templates")).toBeNull();
  });
});
