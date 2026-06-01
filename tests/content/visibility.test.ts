import { describe, expect, it } from "vitest";
import {
  filterPathsByVisibleRoots,
  filterTreeByVisibleRoots,
  parseVisibleRootFoldersValue,
  topLevelFolder,
  visibleRootFolders,
} from "@/lib/content/visibility";

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

  it("filters repository trees by selected root folders", () => {
    const tree = {
      name: "TIL",
      path: "",
      type: "directory" as const,
      kind: "other" as const,
      children: [
        { name: "cs", path: "cs", type: "directory" as const, kind: "other" as const, children: [] },
        {
          name: "languages",
          path: "languages",
          type: "directory" as const,
          kind: "other" as const,
          children: [],
        },
      ],
    };

    expect(filterTreeByVisibleRoots(tree, ["cs"]).children?.map((node) => node.path)).toEqual(["cs"]);
  });

  it("parses persisted visible root folders", () => {
    expect(parseVisibleRootFoldersValue(encodeURIComponent(JSON.stringify(["cs", "languages"])))).toEqual([
      "cs",
      "languages",
    ]);
    expect(parseVisibleRootFoldersValue("not-json")).toEqual([]);
  });
});
