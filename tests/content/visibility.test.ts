import { describe, expect, it } from "vitest";
import { filterPathsByVisibleRoots, topLevelFolder, visibleRootFolders } from "@/lib/content/visibility";

describe("folder visibility", () => {
  const paths = [
    "cs/network/README.md",
    "languages/javascript/theory/object.md",
    "coding-test/codetree/problem.md",
  ];

  it("extracts the top-level folder from a repository path", () => {
    expect(topLevelFolder("languages/javascript/theory/object.md")).toBe("languages");
  });

  it("filters repository paths by selected root folders", () => {
    expect(filterPathsByVisibleRoots(paths, ["cs", "languages"])).toEqual([
      "cs/network/README.md",
      "languages/javascript/theory/object.md",
    ]);
  });

  it("uses every root folder when no saved selection exists", () => {
    expect(visibleRootFolders(paths, [])).toEqual(["coding-test", "cs", "languages"]);
  });
});
