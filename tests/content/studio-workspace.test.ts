import { describe, expect, it } from "vitest";
import { treeFromPaths } from "@/lib/content/indexer";
import {
  buildStudioWorkspace,
  defaultSaveModeForDraft,
  topicPathFromSelection,
} from "@/lib/content/studio-workspace";

describe("studio workspace selection", () => {
  const tree = treeFromPaths([
    "cs/algorithms/README.md",
    "cs/algorithms/theory/kmp.md",
    "cs/algorithms/notes/APSS/ch6.md",
    "cs/networks/README.md",
    "software-engineering/etc/README.md",
    "software-engineering/etc/notes/mentoring/solid.md",
    "languages/javascript/theory/prototype.md",
    "languages/javascript/notes/book-a/ch1.md",
    "coding-test/programmers/problem.md",
  ]);

  it("lists publishable areas and topics without exposing notes or theory internals", () => {
    const workspace = buildStudioWorkspace(tree, ["cs", "languages", "software-engineering"]);

    expect(workspace.areas.map((area) => area.path)).toEqual(["cs", "languages", "software-engineering"]);
    expect(workspace.areas[0].topics.map((topic) => topic.path)).toEqual([
      "cs/algorithms",
      "cs/networks",
    ]);
    expect(workspace.areas[0].topics[0].sources.map((source) => source.name)).toEqual(["APSS"]);
  });

  it("builds a topic path from an existing or new topic selection", () => {
    expect(topicPathFromSelection({ area: "cs", existingTopicPath: "cs/algorithms", newTopicName: "" })).toBe(
      "cs/algorithms",
    );
    expect(topicPathFromSelection({ area: "cs", existingTopicPath: "", newTopicName: "Graph Theory" })).toBe(
      "cs/graph-theory",
    );
  });

  it("recommends review saves for theory and quick saves for notes", () => {
    expect(defaultSaveModeForDraft("note")).toBe("quick");
    expect(defaultSaveModeForDraft("theory")).toBe("review");
  });
});
