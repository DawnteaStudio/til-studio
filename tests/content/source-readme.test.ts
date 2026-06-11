import { describe, expect, it } from "vitest";
import {
  isRemovableSourceReadme,
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
    expect(readme).toContain("| 날짜 | 주제 | src | note |");
    expect(readme).toContain(
      "| 2026-06-09 | 변수와 입력 | - | [variable.md](./note/variable.md) |",
    );
    expect(readme).toContain(
      "| 2026-06-10 | 배열과 포인터 | [array-pointer](./src/array-pointer/) | [array-pointer.md](./note/array-pointer.md) |",
    );
    expect(readme).toContain(
      "| - | collections | [collections](./src/collections/) | - |",
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
    expect(readme).toContain("| - | Ch06 | [Ch06](./src/Ch06/) | - |");
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

  it("recognizes a generated minimal source README with normalized whitespace", () => {
    const sourcePath = "languages/c/notes/hongongc";
    const content = upsertSourceReadme({
      sourcePath,
      metadata: { name: "혼자 공부하는 C", type: "book" },
      existingContent: null,
      notes: [],
      srcSlugs: [],
    })
      .replace(/\n/g, "  \r\n")
      .trimEnd();

    expect(isRemovableSourceReadme({ sourcePath, content })).toBe(true);
  });

  it("recognizes generated source metadata sections as removable", () => {
    const sourcePath = "languages/java/notes/java-intro";
    const content = upsertSourceReadme({
      sourcePath,
      metadata: {
        name: "Java Intro",
        type: "lecture",
        overview: "JVM과 Java 문법을 함께 학습한다.",
        technologies: ["Java", "JVM"],
        references: ["Java Language Specification"],
      },
      notes: [],
      srcSlugs: [],
    });

    expect(isRemovableSourceReadme({ sourcePath, content })).toBe(true);
  });

  it("preserves a generated source README with user prose outside its managed block", () => {
    const sourcePath = "languages/c/notes/hongongc";
    const content = `${upsertSourceReadme({
      sourcePath,
      metadata: { name: "혼자 공부하는 C", type: "book" },
      existingContent: null,
      notes: [],
      srcSlugs: [],
    })}\n직접 작성한 참고 문장입니다.\n`;

    expect(isRemovableSourceReadme({ sourcePath, content })).toBe(false);
  });
});
