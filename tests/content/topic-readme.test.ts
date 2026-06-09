import { describe, expect, it } from "vitest";
import { readmePathForContentPath, upsertTopicReadmeIndex } from "@/lib/content/topic-readme";

describe("topic README index generation", () => {
  it("resolves note and theory documents to their topic README", () => {
    expect(readmePathForContentPath("software-engineering/design/notes/etc/solid.md")).toBe(
      "software-engineering/design/README.md",
    );
    expect(readmePathForContentPath("software-engineering/design/theory/solid.md")).toBe(
      "software-engineering/design/README.md",
    );
  });

  it("adds notes and theory entries to a managed README block", () => {
    const readme = upsertTopicReadmeIndex({
      topicPath: "software-engineering/design",
      existingContent: "# Design\n\nHand-written intro.",
      documentPaths: [
        "software-engineering/design/notes/etc/note/solid.md",
        "software-engineering/design/notes/etc/note/ocp.md",
        "software-engineering/design/notes/mentoring/note/oop.md",
        "software-engineering/design/theory/srp.md",
      ],
    });

    expect(readme).toContain("Hand-written intro.");
    expect(readme).toContain("<!-- til-studio:index:start -->");
    expect(readme).toContain("## Notes");
    expect(readme).toContain("- [etc](notes/etc/)");
    expect(readme).toContain("- [mentoring](notes/mentoring/)");
    expect(readme).not.toContain("notes/etc/note/solid.md");
    expect(readme).toContain("## Theory");
    expect(readme).toContain("- [srp](theory/srp.md)");
  });

  it("replaces an existing managed block without removing user content", () => {
    const readme = upsertTopicReadmeIndex({
      topicPath: "cs/network",
      existingContent:
        "# Network\n\nBefore\n\n<!-- til-studio:index:start -->\nold\n<!-- til-studio:index:end -->\n\nAfter",
      documentPaths: ["cs/network/theory/tcp.md"],
    });

    expect(readme).toContain("Before");
    expect(readme).toContain("After");
    expect(readme).not.toContain("old");
    expect(readme).toContain("- [tcp](theory/tcp.md)");
  });
});
