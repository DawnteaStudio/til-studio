import { FAILSAFE_SCHEMA, load } from "js-yaml";
import { linkedPracticeSlugs, parseFrontmatterSourceSlugs } from "./source-readme";

export class PracticeMetadataError extends Error {
  constructor(message = "글의 YAML frontmatter와 src 형식을 확인하세요. src에는 폴더명 또는 폴더명 목록을 사용할 수 있습니다.") {
    super(message);
  }
}

export function isValidPracticeName(name: string): boolean {
  return name.length > 0 && name === name.trim() && !name.startsWith(".") &&
    !/[/\\\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(name) && !(name.includes('"') && name.includes("'"));
}

function quote(name: string) {
  // The TIL README workflow reads one quoted value per line, without YAML escape decoding.
  const mark = name.includes('"') ? "'" : '"';
  return mark + name + mark;
}

function yaml(text: string): unknown {
  try {
    return load(text, { schema: FAILSAFE_SCHEMA });
  } catch {
    throw new PracticeMetadataError();
  }
}

// Locate a trailing comment without consuming a # inside a quoted or plain folder name.
function splitComment(line: string) {
  for (const match of line.matchAll(/(?:^|[ \t]+)#/g)) {
    const prefix = line.slice(0, match.index);
    try {
      // A # within quotes or a flow list leaves an incomplete YAML value when truncated.
      load("item: " + prefix, { schema: FAILSAFE_SCHEMA });
      return { value: prefix, comment: line.slice(match.index) };
    } catch {
      continue;
    }
  }
  return { value: line, comment: "" };
}

function analyze(markdown: string) {
  const first = /^---(\r?\n)/.exec(markdown);
  if (!first) {
    if (/^\uFEFF?---(?:[a-z]+)?[ \t]*(?:\r?\n|$)/i.test(markdown)) throw new PracticeMetadataError();
    return { names: [] as string[], rewrite: (names: string[]) => {
      const eol = markdown.includes("\r\n") ? "\r\n" : "\n";
      return "---" + eol + render(names, eol) + "---" + eol + eol + markdown;
    } };
  }
  const eol = first[1];
  const afterOpening = markdown.slice(first[0].length);
  const close = /^---[ \t]*(?=\r?$)/m.exec(afterOpening);
  if (!close) throw new PracticeMetadataError();
  const raw = afterOpening.slice(0, close.index);
  const rows = raw.match(/[^\n]*\n/g) ?? [];
  const parsed = yaml(raw);
  if (parsed !== undefined && (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))) throw new PracticeMetadataError();
  const fields = (parsed ?? {}) as Record<string, unknown>;
  if (Object.hasOwn(fields, "<<")) throw new PracticeMetadataError();
  const srcRow = rows.findIndex(line => /^src:(?:[ \t]|\r?\n)/.test(line));
  const edited = new Map<number, string>();
  let names: string[] = [];
  if (Object.hasOwn(fields, "src")) {
    if (srcRow < 0) throw new PracticeMetadataError();
    const list = fields.src === null ? [] : Array.isArray(fields.src) ? fields.src : [fields.src];
    if (!list.every((item): item is string => typeof item === "string" && isValidPracticeName(item))) throw new PracticeMetadataError();
    names = [...new Set(list)];
    const removed: string[] = [];
    function take(i: number, valueStart: number) {
      const line = rows[i];
      const ending = line.endsWith("\r\n") ? "\r\n" : "\n";
      const { value, comment } = splitComment(line.slice(valueStart, -ending.length));
      if (/^[|>&*!]/.test(value.trimStart())) throw new PracticeMetadataError();
      edited.set(i, comment ? comment + ending : "");
      removed.push(line);
      return value.trim();
    }
    const inline = take(srcRow, 4);
    if (!inline) {
      for (let i = srcRow + 1; i < rows.length; i++) {
        if (/^\s*(?:#.*)?\r?\n$/.test(rows[i])) continue;
        const item = /^[ ]*-[ \t]+/.exec(rows[i]);
        if (!item) break;
        take(i, item[0].length);
      }
    }
    // Reject multiline, aliased or otherwise ambiguous src values unless every value was
    // accounted for by the lines we will replace. Other YAML fields are never serialized.
    const standalone = yaml(removed.join("")) as Record<string, unknown> | undefined;
    if (JSON.stringify(standalone?.src) !== JSON.stringify(fields.src)) throw new PracticeMetadataError();
  } else if (srcRow !== -1) {
    throw new PracticeMetadataError();
  }
  return { names, rewrite: (next: string[]) => {
    const field = render(next, eol);
    const header = rows.map((line, i) => (i === srcRow ? field : "") + (edited.get(i) ?? line)).join("");
    const nextHeader = header + (srcRow === -1 ? field : "");
    // An anchor defined inside the old src could also be referenced by an unrelated key.
    // Verify the patched YAML before exposing it as a draft or submitting a commit.
    yaml(nextHeader);
    return first[0] + nextHeader + afterOpening.slice(close.index);
  } };
}

function render(names: string[], eol: string) {
  return names.length ? ["src:", ...names.map(name => "  - " + quote(name)), ""].join(eol) : "";
}

export function readPracticeLinks(markdown: string): string[] {
  return analyze(markdown).names;
}

export function addPracticeLinks(markdown: string, names: readonly string[]): string {
  if (!names.every(isValidPracticeName)) throw new PracticeMetadataError("실습 폴더 이름과 경로 구분자를 확인하세요.");
  const info = analyze(markdown);
  const next = [...new Set([...info.names, ...names])];
  return next.length === info.names.length ? markdown : info.rewrite(next);
}

export function removePracticeLinks(markdown: string, names: readonly string[]): string {
  const info = analyze(markdown);
  const next = info.names.filter(name => !names.includes(name));
  return next.length === info.names.length ? markdown : info.rewrite(next);
}

export function linkExistingPractice(markdown: string, noteSlug: string, available: readonly string[], practice: string): string {
  if (!isValidPracticeName(practice)) throw new PracticeMetadataError();
  const info = analyze(markdown);
  const folders = new Set(available);
  // The published index uses TIL's legacy parser. In particular it may have linked the
  // same-name fallback when a hand-written scalar or inline list had a trailing comment.
  const published = linkedPracticeSlugs(noteSlug, parseFrontmatterSourceSlugs(markdown), folders);
  if (published.includes(practice)) return markdown;
  const effective = linkedPracticeSlugs(noteSlug, info.names, folders);
  const next = [...new Set([...info.names, ...effective, ...published, practice])];
  if (!next.every(isValidPracticeName)) throw new PracticeMetadataError();
  return info.rewrite(next);
}
