import { describe, expect, it } from "vitest";
import {
  parseSourceNote,
  sourceReadmePathForNote,
  upsertSourceReadme,
} from "@/lib/content/source-readme";

describe("source README generation", () => {
  it("resolves a note path to its source README", () => {
    expect(
      sourceReadmePathForNote("languages/c/notes/hongongc/note/array-pointer.md"),
    ).toBe("languages/c/notes/hongongc/README.md");
    expect(sourceReadmePathForNote("languages/c/theory/pointer.md")).toBeNull();
  });

  it("parses created metadata and the first H1 from a note", () => {
    expect(
      parseSourceNote({
        path: "languages/c/notes/hongongc/note/array-pointer.md",
        content: "---\ncreated: 2026-06-10\n---\n\n# 배열과 포인터\n",
      }),
    ).toEqual({
      path: "languages/c/notes/hongongc/note/array-pointer.md",
      slug: "array-pointer",
      created: "2026-06-10",
      title: "배열과 포인터",
    });
  });

  it("creates one learning log for note-only, paired, and src-only entries", () => {
    const readme = upsertSourceReadme({
      sourcePath: "languages/c/notes/hongongc",
      metadata: {
        name: "혼자 공부하는 C",
        type: "book",
        overview: "C 문법과 실습을 기록한다.",
        technologies: ["C"],
        references: ["서현우, 혼자 공부하는 C"],
      },
      existingContent: null,
      notes: [
        {
          path: "languages/c/notes/hongongc/note/array-pointer.md",
          slug: "array-pointer",
          created: "2026-06-10",
          title: "배열과 포인터",
        },
        {
          path: "languages/c/notes/hongongc/note/variable.md",
          slug: "variable",
          created: "2026-06-09",
          title: "변수와 입력",
        },
      ],
      srcSlugs: ["array-pointer", "collections"],
    });

    expect(readme).toContain("# 혼자 공부하는 C");
    expect(readme).toContain("유형: 책");
    expect(readme).toContain("├── note/");
    expect(readme).toContain("└── src/");
    expect(readme).toContain(
      "| 2026-06-09 | 변수와 입력 | - | [note](./note/variable.md) |",
    );
    expect(readme).toContain(
      "| 2026-06-10 | 배열과 포인터 | [src](./src/array-pointer/) | [note](./note/array-pointer.md) |",
    );
    expect(readme).toContain(
      "| - | collections | [src](./src/collections/) | - |",
    );
    expect(readme).not.toContain("## 연결 대기");
  });

  it("matches src slugs case-sensitively and preserves prose outside the managed block", () => {
    const readme = upsertSourceReadme({
      sourcePath: "cs/algorithms/notes/apss",
      metadata: { name: "APSS", type: "book" },
      existingContent:
        "# APSS\n\n직접 작성한 소개\n\n<!-- til-studio:learning-log:start -->\nold\n<!-- til-studio:learning-log:end -->\n\n직접 작성한 참고",
      notes: [
        {
          path: "cs/algorithms/notes/apss/note/ch06.md",
          slug: "ch06",
          created: "2026-06-10",
          title: "무식하게 풀기",
        },
      ],
      srcSlugs: ["Ch06"],
    });

    expect(readme).toContain("직접 작성한 소개");
    expect(readme).toContain("직접 작성한 참고");
    expect(readme).not.toContain("\nold\n");
    expect(readme).toContain("| 2026-06-10 | 무식하게 풀기 | - |");
    expect(readme).toContain("| - | Ch06 | [src](./src/Ch06/) | - |");
    expect(readme).not.toContain("## 연결 대기");
  });

  it("renders technology badges and plain text technologies", () => {
    const readme = upsertSourceReadme({
      sourcePath: "languages/java/notes/java-intro",
      metadata: {
        name: "Java Intro",
        type: "lecture",
        technologies: [
          {
            name: "Java",
            badge: {
              label: "Java",
              color: "ED8B00",
              logo: "openjdk",
              logoColor: "white",
            },
          },
          { name: "JVM internals" },
        ],
      },
      notes: [],
      srcSlugs: [],
    });

    expect(readme).toContain(
      "![Java](https://img.shields.io/badge/Java-ED8B00?logo=openjdk&logoColor=white&style=plastic)",
    );
    expect(readme).toContain("- JVM internals");
  });
});
