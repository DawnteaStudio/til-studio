import { expect, it } from "vitest";
import { addPracticeLinks, isValidPracticeName, linkExistingPractice, PracticeMetadataError, readPracticeLinks, removePracticeLinks } from "@/lib/content/practice-links";
import { parseFrontmatterSourceSlugs } from "@/lib/content/source-readme";

const body = "\n\n # Title\r\n\r\n```yaml\r\nsrc: [body]\r\n```  ";
const special = "한글 Lab [2], #C++";
it("edits only src, preserving manual metadata, comments, CRLF and all body bytes", () => {
  const start = "---\r\ncreated: 2025-03-10 # manual\r\n";
  const end = "other:\n  - \"완료\"  \r\n---\r\n" + body;
  const raw = start + "src: [old, 'reserved'] # keep\r\n" + end;
  const next = addPracticeLinks(raw, [special, "true", 'a"b', "a'b"]);
  expect(next.startsWith(start)).toBe(true);
  expect(next.endsWith(end)).toBe(true);
  expect(next).toContain(" # keep\r\n");
  expect(readPracticeLinks(next)).toEqual(["old", "reserved", special, "true", 'a"b', "a'b"]);
  expect(parseFrontmatterSourceSlugs(next)).toEqual(readPracticeLinks(next));
  expect(addPracticeLinks(next, [special])).toBe(next);
  expect(readPracticeLinks(removePracticeLinks(next, [special]))).toEqual(["old", "reserved", "true", 'a"b', "a'b"]);
});
it("removes the last list without dropping comments between entries or touching a nested src", () => {
  const raw = "---\nsrc:\n - 'one'  # one!\n # keep\n - two\nmeta:\n  src: unchanged\n---\n" + body;
  expect(readPracticeLinks(raw)).toEqual(["one", "two"]);
  expect(removePracticeLinks(raw, ["one", "two"])).toBe("---\n  # one!\n # keep\nmeta:\n  src: unchanged\n---\n" + body);
});
it("creates frontmatter, keeps original document verbatim and adds implicit plus reserved links", () => {
  const raw = "\n\r\n# 한글\r\nend  ";
  expect(addPracticeLinks(raw, [special]).endsWith(raw)).toBe(true);
  const reserved = "---\nsrc: later\n---\n" + raw;
  expect(readPracticeLinks(linkExistingPractice(reserved, "chapter", ["chapter", special], special))).toEqual(["later","chapter",special]);
  expect(linkExistingPractice(reserved, "chapter", ["chapter"], "chapter")).toBe(reserved);
});
it.each(["../a","/tmp","a/b","a\\b",".private","tail ","a\nb","a\tb","a\u0000b"])("rejects invalid names %j", name => {
  expect(isValidPracticeName(name)).toBe(false);
  expect(() => addPracticeLinks("#", [name])).toThrow(PracticeMetadataError);
});
it.each(["src: [broken", "src: [a]\nsrc: b", "src:\n  nested: x", "src: &anchor [x]", "'src': a", "key: [", "src: |\n  a"])("rejects ambiguous YAML instead of destroying values: %s", header => {
  expect(() => addPracticeLinks("---\n" + header + "\n---\n# Body", ["b"])).toThrow(PracticeMetadataError);
});
it("preserves comments on bare folder names containing an embedded quote", () => {
  const raw = "---\nsrc: Bob 'lab # manual comment\n---\nbody";
  expect(addPracticeLinks(raw, ["work"])).toContain(" # manual comment\n");
});
it("accepts empty src and refuses to remove anchors used in other fields or corrupt a flow mapping", () => {
  expect(readPracticeLinks(addPracticeLinks("---\nsrc:\n---\n", ["a"]))).toEqual(["a"]);
  expect(() => addPracticeLinks("---\nsrc: [&kept a]\nexternal: *kept\n---\n", ["b"])).toThrow(PracticeMetadataError);
  expect(() => addPracticeLinks("---\n{date: today}\n---\n", ["b"])).toThrow(PracticeMetadataError);
});
it("keeps the published same-name fallback if the original manual src used a trailing comment", () => {
  const raw = "---\nsrc: extra # manual\n---\nbody";
  const next = linkExistingPractice(raw, "chapter", ["chapter","extra","new"], "new");
  expect(readPracticeLinks(next)).toEqual(["extra","chapter","new"]);
});
