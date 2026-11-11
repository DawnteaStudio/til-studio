import { describe, expect, it } from "vitest";
import { articleHref, compareChapters, practiceHref, sortByRecent } from "@/lib/content/archive";
import { indexArchive } from "@/lib/content/archive-index";
import { buildNotePath } from "@/lib/content/paths";

const prefix = "languages/c/notes/hongongC";
const chapter = (slug: string) => `${prefix}/note/${slug}.md`;

describe("archive metadata from repository content", () => {
  it("keeps a published reservation visible until that material contains actual code", () => {
    const files = [{ path: chapter("pointers"), body: "---\nsrc: [lab-2, next]\n---\n# Pointers", updated: null }];
    const paths = [`${prefix}/src/lab-2/.gitkeep`, "languages/c/notes/other/src/lab-2/main.c"];
    expect(indexArchive(files, paths).articles[0]).toMatchObject({ pendingPractices: ["lab-2", "next"] });
    paths.push(`${prefix}/src/lab-2/exercises/main.c`);
    expect(indexArchive(files, paths).articles[0]).toMatchObject({ pendingPractices: ["next"] });
    paths.push(`${prefix}/src/next/main.c`);
    expect(indexArchive(files, paths).articles[0].pendingPractices ?? []).toEqual([]);
  });

  it("uses actual headings and note dates, orders chapters numerically and keeps README files out", () => {
    const { articles } = indexArchive([
      { path: chapter("ch2"), body: '---\ncreated: 2023-07-30\n---\n\n```md\n# Not a heading\n```\n## **C 언어 입문**\n\n### 포인터', updated: "2026-10-03" },
      { path: chapter("ch10"), body: "# 배열", updated: "2024-01-01" },
      { path: "cs/algorithms/theory/kmp.md", body: "## KMP\n\ncreated: 2010-01-01", updated: "2026-09-08" },
      { path: `${prefix}/README.md`, body: "# 강의", updated: null },
    ], []);
    expect(articles[0]).toMatchObject({ title: "C 언어 입문", created: "2023-07-30", headings: ["포인터"], source: "hongongC" });
    expect(sortByRecent(articles).map((a) => a.title)).toEqual(["KMP", "배열", "C 언어 입문"]);
    expect(articles.filter((a) => a.source).sort(compareChapters).map((a) => a.path)).toEqual([chapter("ch2"), chapter("ch10")]);
  });

  it("shows only unlinked code folders, honors explicit links and preserves the existing material's exact name", () => {
    const allPaths = ["ch1", "ch2", "ch3", "ch4"].map((key) => `${prefix}/src/${key}/Main.c`);
    const { practices } = indexArchive([
      { path: chapter("ch1"), body: "---\nsrc: [ch2, ch3]\n---\n# 두 실습", updated: null },
      { path: chapter("ch4"), body: "# 네 번째", updated: null },
    ], [...allPaths, `${prefix}/src/empty/.gitkeep`, `${prefix}/src/.gitkeep`, "coding-test/java/notes/solved/src/abc/Main.java"]);
    expect(practices).toEqual([{ topicPath: "languages/c", source: "hongongC", slug: "ch1" }]);
    expect(practiceHref(practices[0])).toBe("/studio?topic=languages%2Fc&source=hongongC&practice=ch1");
    expect(buildNotePath({ area: "languages", topic: "c", title: "Pointers", source: "hongongC", existingSourceName: "hongongC" })).toBe(chapter("pointers"));
    expect(articleHref("a/[강의] #1.md")).toBe("/docs/a/%5B%EA%B0%95%EC%9D%98%5D%20%231.md");
  });
});
