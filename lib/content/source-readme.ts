import { extractTitle } from "./markdown";
import {
  technologyBadgeMarkdown,
  type TechnologyMetadata,
} from "./technology-badges";

const learningLogStart = "<!-- til-studio:learning-log:start -->";
const learningLogEnd = "<!-- til-studio:learning-log:end -->";

export type SourceType = "book" | "lecture" | "mentoring" | "course" | "etc";

export type SourceMetadata = {
  name: string;
  type: SourceType;
  overview?: string;
  technologies?: Array<string | TechnologyMetadata>;
  references?: string[];
};

export type SourceNote = {
  path: string;
  slug: string;
  created: string;
  title: string;
  srcSlugs: string[];
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

export function sourcePathForContentPath(path: string): string | null {
  const segments = path.split("/");
  const notesIndex = segments.indexOf("notes");
  const sourceSlug = segments[notesIndex + 1];
  const sourceChild = segments[notesIndex + 2];
  if (notesIndex < 2 || !sourceSlug || !sourceChild) return null;

  if (sourceChild === "README.md" || sourceChild === "note" || sourceChild === "src") {
    return segments.slice(0, notesIndex + 2).join("/");
  }

  return null;
}

export function isRemovableSourceReadme(input: {
  sourcePath: string;
  content: string;
}): boolean {
  const base = removeManagedBlock(
    normalizeReadme(input.content),
    learningLogStart,
    learningLogEnd,
  );
  if (base === null) return false;

  const sourceSlug = escapeRegExp(
    input.sourcePath.split("/").at(-1) ?? "source",
  );
  const generatedBasePattern = new RegExp(
    [
      String.raw`^\[상위 README로 이동\]\(\.\.\/\.\.\/README\.md\)`,
      String.raw`# [^\n]+`,
      String.raw`유형: (책|강의|멘토링|코스|기타)`,
      String.raw`## 개요`,
      String.raw`[\s\S]+?`,
      String.raw`## 디렉터리 구조`,
      "```text",
      `${sourceSlug}/`,
      String.raw`├── README\.md`,
      String.raw`├── note\/    # 학습 기록 Markdown`,
      String.raw`└── src\/     # note와 같은 slug를 사용하는 실습 코드`,
      "```",
      String.raw`## 작성 원칙`,
      String.raw`- 같은 학습 단위는 기본적으로 하나의 slug를 사용합니다\.`,
      String.raw`- 학습 기록은 \`note\/<slug>\.md\`에 작성합니다\.`,
      String.raw`- 관련 실습 코드는 \`src\/<slug>\/\` 아래에 둡니다\.`,
      String.raw`- note slug와 src 폴더명이 다르면 note frontmatter의 \`src\` 목록으로 연결합니다\.`,
      String.raw`- 예: \`src: \[ch1, ch2\]\`는 해당 note를 \`src\/ch1\/\`, \`src\/ch2\/\`와 연결합니다\.`,
      String.raw`- note와 src는 어느 한쪽만 먼저 존재해도 됩니다\.`,
      String.raw`- \`build\/\`, \`\.gradle\/\`, \`node_modules\/\`, 바이너리와 IDE 캐시는 커밋하지 않습니다\.`,
      String.raw`- 학습 기록 관리 블록은 자동 생성되므로 직접 수정하지 않습니다\.`,
    ].join("\n\n") +
      String.raw`(?:\n\n## 언어 및 기술(?:\n\n(?!## ).+)+)?` +
      String.raw`(?:\n\n## 참고 자료(?:\n\n- .+)+)?$`,
  );

  return generatedBasePattern.test(base.replace(/\n\n---$/, ""));
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
    srcSlugs: parseFrontmatterSourceSlugs(input.content),
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
  const technologies = (metadata.technologies ?? [])
    .map((technology) =>
      typeof technology === "string" ? { name: technology } : technology,
    )
    .filter((technology) => technology.name.trim());
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
    "- 같은 학습 단위는 기본적으로 하나의 slug를 사용합니다.",
    "- 학습 기록은 `note/<slug>.md`에 작성합니다.",
    "- 관련 실습 코드는 `src/<slug>/` 아래에 둡니다.",
    "- note slug와 src 폴더명이 다르면 note frontmatter의 `src` 목록으로 연결합니다.",
    "- 예: `src: [ch1, ch2]`는 해당 note를 `src/ch1/`, `src/ch2/`와 연결합니다.",
    "- note와 src는 어느 한쪽만 먼저 존재해도 됩니다.",
    "- `build/`, `.gradle/`, `node_modules/`, 바이너리와 IDE 캐시는 커밋하지 않습니다.",
    "- 학습 기록 관리 블록은 자동 생성되므로 직접 수정하지 않습니다.",
    ...(technologies.length
      ? [
          "## 언어 및 기술",
          ...technologies.map(
            (technology) =>
              technologyBadgeMarkdown(technology) ?? `- ${technology.name}`,
          ),
        ]
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
  const srcOnlySlugs = [...sourceSet]
    .filter((slug) => {
      const isLinked = sortedNotes.some((note) => {
        const explicitSlugs = note.srcSlugs.filter((srcSlug) =>
          sourceSet.has(srcSlug),
        );
        return explicitSlugs.length
          ? explicitSlugs.includes(slug)
          : note.slug === slug;
      });
      return !isLinked;
    })
    .sort();
  const lines = [
    learningLogStart,
    "## 학습 기록",
    "",
    "| 날짜 | 주제 | src | note |",
    "| --- | --- | --- | --- |",
  ];

  if (sortedNotes.length || srcOnlySlugs.length) {
    for (const note of sortedNotes) {
      const explicitSlugs = note.srcSlugs.filter((slug) => sourceSet.has(slug));
      const linkedSlugs = explicitSlugs.length
        ? explicitSlugs
        : sourceSet.has(note.slug)
          ? [note.slug]
          : [];
      const srcLink = linkedSlugs.length
        ? linkedSlugs.map((slug) => sourceLink(slug)).join(", ")
        : "-";
      const noteFilename = `${note.slug}.md`;
      lines.push(
        `| ${note.created || "-"} | ${escapeTableCell(note.title)} | ${srcLink} | [${escapeLinkLabel(noteFilename)}](./note/${encodeURIComponent(note.slug)}.md) |`,
      );
    }
    for (const slug of srcOnlySlugs) {
      lines.push(
        `| - | ${escapeTableCell(readableSlug(slug))} | [${escapeLinkLabel(slug)}](./src/${encodeURIComponent(slug)}/) | - |`,
      );
    }
  } else {
    lines.push("| - | 아직 작성된 학습 기록이 없습니다. | - | - |");
  }

  lines.push(learningLogEnd);

  return lines.join("\n");
}

function parseFrontmatterSourceSlugs(content: string): string[] {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return [];

  const lines = frontmatter[1].split(/\r?\n/);
  const slugs: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const inlineMatch = line.match(/^src:\s*(.+?)\s*$/);
    if (inlineMatch) {
      slugs.push(...parseInlineSourceSlugs(inlineMatch[1]));
      continue;
    }

    if (!/^src:\s*$/.test(line)) continue;

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const listMatch = lines[cursor].match(/^\s*-\s*(.+?)\s*$/);
      if (!listMatch) break;
      slugs.push(cleanSourceSlug(listMatch[1]));
      index = cursor;
    }
  }

  return [...new Set(slugs.filter(Boolean))];
}

function parseInlineSourceSlugs(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map(cleanSourceSlug)
      .filter(Boolean);
  }
  return [cleanSourceSlug(trimmed)].filter(Boolean);
}

function cleanSourceSlug(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function sourceLink(slug: string): string {
  return `[${escapeLinkLabel(slug)}](./src/${encodeURIComponent(slug)}/)`;
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

function escapeLinkLabel(value: string): string {
  return escapeTableCell(value).replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeReadme(content: string): string {
  return content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();
}

function removeManagedBlock(
  content: string,
  startMarker: string,
  endMarker: string,
): string | null {
  if (count(content, startMarker) !== 1 || count(content, endMarker) !== 1) {
    return null;
  }

  const pattern = new RegExp(
    `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`,
  );
  return normalizeReadme(content.replace(pattern, ""));
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
