import { extractTitle } from "./markdown";

const learningLogStart = "<!-- til-studio:learning-log:start -->";
const learningLogEnd = "<!-- til-studio:learning-log:end -->";

export type SourceType = "book" | "lecture" | "mentoring" | "course" | "etc";

export type SourceMetadata = {
  name: string;
  type: SourceType;
  overview?: string;
  technologies?: string[];
  references?: string[];
};

export type SourceNote = {
  path: string;
  slug: string;
  created: string;
  title: string;
};

export function sourceReadmePathForNote(path: string): string | null {
  const segments = path.split("/");
  const notesIndex = segments.indexOf("notes");
  if (
    notesIndex < 2 ||
    segments[notesIndex + 2] !== "note" ||
    !segments.at(-1)?.endsWith(".md")
  ) {
    return null;
  }

  return `${segments.slice(0, notesIndex + 2).join("/")}/README.md`;
}

export function sourcePathForNote(path: string): string | null {
  const readmePath = sourceReadmePathForNote(path);
  return readmePath?.replace(/\/README\.md$/i, "") ?? null;
}

export function parseSourceNote(input: { path: string; content: string }): SourceNote {
  const filename = input.path.split("/").at(-1) ?? "";
  const slug = filename.replace(/\.md$/i, "");
  const created = input.content.match(/^created:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/m)?.[1] ?? "";
  const extractedTitle = extractTitle(input.content);

  return {
    path: input.path,
    slug,
    created,
    title: extractedTitle === "Untitled" ? readableSlug(slug) : extractedTitle,
  };
}

export function upsertSourceReadme(input: {
  sourcePath: string;
  metadata: SourceMetadata;
  existingContent?: string | null;
  notes: SourceNote[];
  srcSlugs: string[];
}): string {
  const base =
    input.existingContent?.trimEnd() ||
    createSourceReadmeBase(input.sourcePath, input.metadata).trimEnd();
  const block = renderLearningLog(input.notes, input.srcSlugs);
  const markerPattern = new RegExp(
    `${escapeRegExp(learningLogStart)}[\\s\\S]*?${escapeRegExp(learningLogEnd)}`,
  );

  if (markerPattern.test(base)) {
    return `${base.replace(markerPattern, block).trimEnd()}\n`;
  }

  return `${base}\n\n---\n\n${block}\n`;
}

function createSourceReadmeBase(sourcePath: string, metadata: SourceMetadata): string {
  const sourceSlug = sourcePath.split("/").at(-1) ?? "source";
  const overview = metadata.overview?.trim() || `${metadata.name} 학습 내용을 정리합니다.`;
  const technologies = (metadata.technologies ?? []).filter(Boolean);
  const references = (metadata.references ?? []).filter(Boolean);

  return [
    "[상위 README로 이동](../../README.md)",
    `# ${metadata.name}`,
    `유형: ${sourceTypeLabel(metadata.type)}`,
    "## 개요",
    overview,
    "## 디렉터리 구조",
    "```text",
    `${sourceSlug}/`,
    "├── README.md",
    "├── note/    # 학습 기록 Markdown",
    "└── src/     # note와 같은 slug를 사용하는 실습 코드",
    "```",
    "## 작성 원칙",
    "- 같은 학습 단위는 하나의 slug를 사용합니다.",
    "- 학습 기록은 `note/<slug>.md`에 작성합니다.",
    "- 관련 실습 코드는 `src/<slug>/` 아래에 둡니다.",
    "- note와 src는 어느 한쪽만 먼저 존재해도 됩니다.",
    "- `build/`, `.gradle/`, `node_modules/`, 바이너리와 IDE 캐시는 커밋하지 않습니다.",
    "- 학습 기록 관리 블록은 자동 생성되므로 직접 수정하지 않습니다.",
    ...(technologies.length
      ? ["## 언어 및 기술", ...technologies.map((technology) => `- ${technology}`)]
      : []),
    ...(references.length
      ? ["## 참고 자료", ...references.map((reference) => `- ${reference}`)]
      : []),
  ].join("\n\n");
}

function renderLearningLog(notes: SourceNote[], srcSlugs: string[]): string {
  const sourceSet = new Set(srcSlugs);
  const sortedNotes = [...notes].sort(
    (left, right) =>
      left.created.localeCompare(right.created) || left.slug.localeCompare(right.slug),
  );
  const noteSlugs = new Set(sortedNotes.map((note) => note.slug));
  const srcOnlySlugs = [...sourceSet]
    .filter((slug) => !noteSlugs.has(slug))
    .sort();
  const lines = [
    learningLogStart,
    "## 학습 기록",
    "",
    "| 날짜 | 학습 내용 | 소스 코드 | 노트 |",
    "| --- | --- | --- | --- |",
  ];

  if (sortedNotes.length || srcOnlySlugs.length) {
    for (const note of sortedNotes) {
      const srcLink = sourceSet.has(note.slug) ? `[src](./src/${encodeURIComponent(note.slug)}/)` : "-";
      lines.push(
        `| ${note.created || "-"} | ${escapeTableCell(note.title)} | ${srcLink} | [note](./note/${encodeURIComponent(note.slug)}.md) |`,
      );
    }
    for (const slug of srcOnlySlugs) {
      lines.push(
        `| - | ${escapeTableCell(readableSlug(slug))} | [src](./src/${encodeURIComponent(slug)}/) | - |`,
      );
    }
  } else {
    lines.push("| - | 아직 작성된 학습 기록이 없습니다. | - | - |");
  }

  lines.push(learningLogEnd);

  return lines.join("\n");
}

function sourceTypeLabel(type: SourceType): string {
  return {
    book: "책",
    lecture: "강의",
    mentoring: "멘토링",
    course: "코스",
    etc: "기타",
  }[type];
}

function readableSlug(slug: string): string {
  return slug.replace(/-/g, " ");
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
