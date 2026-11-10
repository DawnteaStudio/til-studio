import { describe, expect, it } from "vitest";
import { upsertSourceReadme, parseSourceNote } from "@/lib/content/source-readme";
import { upsertTopicReadmeIndex } from "@/lib/content/topic-readme";
import { upsertAncestorReadme } from "@/lib/content/ancestor-readme";

const writers = {
  "learning-log": (existingContent: string) => upsertSourceReadme({
    sourcePath: "cs/x/notes/s", existingContent, metadata: { name: "s", type: "book" }, srcSlugs: [], notes: [],
  }),
  index: (existingContent: string) => upsertTopicReadmeIndex({ topicPath: "cs/x", documentPaths: [], existingContent }),
  children: (existingContent: string) => upsertAncestorReadme({ directoryPath: "cs", repositoryPaths: [], existingContent }),
};

describe.each(Object.entries(writers))("%s managed boundaries", (name, write) => {
  const start = `<!-- til-studio:${name}:start -->`;
  const end = `<!-- til-studio:${name}:end -->`;

  it.each([start, end, end + start, start + end + start, start + end + end])(
    "refuses malformed markers", (markers) => expect(() => write("수기 문단 " + markers)).toThrow(/마커/),
  );
  it("keeps all bytes before and after a valid pair, including the final whitespace", () => {
    const prefix = "수기 머리말  \r\n";
    const suffix = "\r\n\r\n수기 끝말  \r\n\r\n";
    const output = write(prefix + start + "\nold\n" + end + suffix);
    expect(output.slice(0, output.indexOf(start))).toBe(prefix);
    expect(output.slice(output.indexOf(end) + end.length)).toBe(suffix);
    expect(write(output)).toBe(output);
  });
});

it("escapes table links and reads the date only from initial frontmatter", () => {
  const note = parseSourceNote({ path: "cs/x/notes/s/note/a[b](c).md", content: "# A|B\n\ncreated: 1999-01-01" });
  const content = upsertSourceReadme({ sourcePath: "cs/x/notes/s", metadata: { name: "s", type: "book" },
    notes: [note], srcSlugs: ["a[b](c)"] });
  expect(content).toContain("| - | A\\|B | [a\\[b\\](c)](./src/a%5Bb%5D%28c%29/) | [a\\[b\\](c).md](./note/a%5Bb%5D%28c%29.md) |");
});
