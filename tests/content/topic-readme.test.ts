import { describe, expect, it } from "vitest";
import {
  isRemovableTopicReadme,
  readmePathForContentPath,
  upsertTopicReadmeIndex,
} from "@/lib/content/topic-readme";

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

  it("encodes parentheses in source links for Markdown compatibility", () => {
    const readme = upsertTopicReadmeIndex({
      topicPath: "cs/networks",
      existingContent: "# Networks",
      documentPaths: [
        "cs/networks/notes/TCP_IP(윤성우의 열혈)/README.md",
      ],
    });

    expect(readme).toContain(
      "- [TCP_IP(윤성우의 열혈)](notes/TCP_IP%28%EC%9C%A4%EC%84%B1%EC%9A%B0%EC%9D%98%20%EC%97%B4%ED%98%88%29/)",
    );
  });

  it("recognizes a generated minimal topic README with normalized whitespace", () => {
    const topicPath = "software-engineering/design";
    const content = upsertTopicReadmeIndex({
      topicPath,
      existingContent: null,
      documentPaths: [],
    })
      .replace(/\n/g, "  \r\n")
      .trimEnd();

    expect(isRemovableTopicReadme({ topicPath, content })).toBe(true);
  });

  it("preserves a generated topic README with user prose outside its managed block", () => {
    const topicPath = "software-engineering/design";
    const content = `${upsertTopicReadmeIndex({
      topicPath,
      existingContent: null,
      documentPaths: [],
    })}\n직접 작성한 주제 소개입니다.\n`;

    expect(isRemovableTopicReadme({ topicPath, content })).toBe(false);
  });
});
