import { describe, expect, it } from "vitest";
import {
  ancestorReadmePath,
  directChildDirectories,
  isRemovableAncestorReadme,
  upsertAncestorReadme,
} from "@/lib/content/ancestor-readme";

describe("ancestor README generation", () => {
  it("resolves README paths for root and nested directories", () => {
    expect(ancestorReadmePath("")).toBe("README.md");
    expect(ancestorReadmePath("languages")).toBe("languages/README.md");
    expect(ancestorReadmePath("new-area/backend")).toBe(
      "new-area/backend/README.md",
    );
  });

  it("lists only direct child content directories", () => {
    expect(
      directChildDirectories("", [
        ".github/workflows/test.yml",
        "README.md",
        "languages/c/README.md",
        "languages/java/notes/java-intro/note/test.md",
        "scripts/reconcile.mjs",
        "templates/template.md",
        "new-area/new-topic/README.md",
      ]),
    ).toEqual(["languages", "new-area"]);

    expect(
      directChildDirectories("languages", [
        "languages/README.md",
        "languages/java/README.md",
        "languages/c/notes/book/note/ch1.md",
        "languages/theory/ignored.md",
        "languages/notes/ignored.md",
      ]),
    ).toEqual(["c", "java"]);
  });

  it("preserves prose and replaces a legacy languages table", () => {
    const readme = upsertAncestorReadme({
      directoryPath: "languages",
      existingContent: [
        "[상위 README로 이동](../README.md)",
        "",
        "# Languages",
        "",
        "프로그래밍 언어 학습 공간입니다.",
        "",
        "---",
        "",
        "## 언어 목록",
        "",
        "| 언어 | 링크 |",
        "| --- | --- |",
        "| C | [바로가기](./c/) |",
        "",
        "---",
        "",
        "## 기본 구조",
        "",
        "설명",
      ].join("\n"),
      repositoryPaths: [
        "languages/c/README.md",
        "languages/java/README.md",
      ],
    });

    expect(readme).toContain("프로그래밍 언어 학습 공간입니다.");
    expect(readme).toContain("## 기본 구조");
    expect(readme).not.toContain("| 언어 | 링크 |");
    expect(readme.match(/<!-- til-studio:children:start -->/g)).toHaveLength(1);
    expect(readme).toContain("- [c](c/)");
    expect(readme).toContain("- [java](java/)");
  });

  it("replaces a legacy cs topic table without removing unrelated tables", () => {
    const readme = upsertAncestorReadme({
      directoryPath: "cs",
      existingContent: [
        "# CS",
        "",
        "## 상태",
        "",
        "| 이름 | 값 |",
        "| --- | --- |",
        "| 공개 | yes |",
        "",
        "## 주제 목록",
        "",
        "| 주제 | 설명 | 링크 |",
        "| --- | --- | --- |",
        "| Algorithms | 알고리즘 | [바로가기](./algorithms/) |",
      ].join("\n"),
      repositoryPaths: [
        "cs/algorithms/README.md",
        "cs/security/README.md",
      ],
    });

    expect(readme).toContain("| 이름 | 값 |");
    expect(readme).not.toContain("| 주제 | 설명 | 링크 |");
    expect(readme).toContain("- [algorithms](algorithms/)");
    expect(readme).toContain("- [security](security/)");
  });

  it("creates a minimal README and sorts children case-insensitively", () => {
    const readme = upsertAncestorReadme({
      directoryPath: "new-area",
      existingContent: null,
      repositoryPaths: [
        "new-area/zeta/README.md",
        "new-area/Alpha/README.md",
      ],
    });

    expect(readme).toContain("[상위 README로 이동](../README.md)");
    expect(readme).toContain("# new area");
    expect(readme.indexOf("- [Alpha](Alpha/)")).toBeLessThan(
      readme.indexOf("- [zeta](zeta/)"),
    );
  });

  it("updates an existing managed block without duplicating it", () => {
    const readme = upsertAncestorReadme({
      directoryPath: "",
      existingContent: [
        "# TIL",
        "",
        "<!-- til-studio:children:start -->",
        "old",
        "<!-- til-studio:children:end -->",
      ].join("\n"),
      repositoryPaths: ["languages/c/README.md", "cs/algorithms/README.md"],
    });

    expect(readme.match(/<!-- til-studio:children:start -->/g)).toHaveLength(1);
    expect(readme).not.toContain("\nold\n");
    expect(readme).toContain("- [cs](cs/)");
    expect(readme).toContain("- [languages](languages/)");
  });

  it("recognizes a generated minimal ancestor README with normalized whitespace", () => {
    const directoryPath = "new-area";
    const content = upsertAncestorReadme({
      directoryPath,
      existingContent: null,
      repositoryPaths: [],
    })
      .replace(/\n/g, "  \r\n")
      .trimEnd();

    expect(isRemovableAncestorReadme({ directoryPath, content })).toBe(true);
  });

  it("preserves a generated ancestor README with user prose outside its managed block", () => {
    const directoryPath = "new-area";
    const content = `${upsertAncestorReadme({
      directoryPath,
      existingContent: null,
      repositoryPaths: [],
    })}\n직접 작성한 영역 소개입니다.\n`;

    expect(isRemovableAncestorReadme({ directoryPath, content })).toBe(false);
  });
});
