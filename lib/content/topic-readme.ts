import { encodeMarkdownPath } from "./markdown-path";

const indexStart = "<!-- til-studio:index:start -->";
const indexEnd = "<!-- til-studio:index:end -->";

export function readmePathForContentPath(path: string): string | null {
  const segments = path.split("/");
  const kindIndex = segments.findIndex((segment) => segment === "notes" || segment === "theory");
  if (kindIndex < 2) return null;

  return `${segments.slice(0, kindIndex).join("/")}/README.md`;
}

export function topicPathForReadme(readmePath: string): string {
  return readmePath.replace(/\/README\.md$/i, "");
}

export function upsertTopicReadmeIndex(input: {
  topicPath: string;
  existingContent?: string | null;
  documentPaths: string[];
}): string {
  const base = input.existingContent?.trimEnd() || `# ${titleFromTopicPath(input.topicPath)}`;
  const block = renderIndexBlock(input.topicPath, input.documentPaths);
  const pattern = new RegExp(`${escapeRegExp(indexStart)}[\\s\\S]*?${escapeRegExp(indexEnd)}`);

  if (pattern.test(base)) {
    return `${base.replace(pattern, block).trimEnd()}\n`;
  }

  return `${base}\n\n${block}\n`;
}

function renderIndexBlock(topicPath: string, documentPaths: string[]): string {
  const noteSources = new Set<string>();
  const theories: string[] = [];

  for (const path of documentPaths) {
    if (!path.startsWith(`${topicPath}/`)) continue;
    const relative = path.slice(topicPath.length + 1);
    const segments = relative.split("/");

    if (segments[0] === "notes" && segments.length >= 2) {
      noteSources.add(segments[1]);
    }

    if (segments[0] === "theory" && segments.length >= 2 && !path.endsWith("README.md")) {
      theories.push(relative);
    }
  }

  const lines = [indexStart, "## Notes"];
  if (noteSources.size) {
    for (const source of [...noteSources].sort()) {
      lines.push(`- [${source}](${encodeMarkdownPath(`notes/${source}/`)})`);
    }
  } else {
    lines.push("", "아직 등록된 note가 없습니다.");
  }

  lines.push("", "## Theory");
  if (theories.length) {
    for (const path of theories.sort()) {
      lines.push(`- [${titleFromFilePath(path)}](${encodeMarkdownPath(path)})`);
    }
  } else {
    lines.push("", "아직 등록된 theory가 없습니다.");
  }

  lines.push(indexEnd);
  return lines.join("\n");
}

function titleFromTopicPath(path: string): string {
  return path.split("/").at(-1)?.replace(/-/g, " ") || "TIL";
}

function titleFromFilePath(path: string): string {
  return (path.split("/").at(-1) ?? path).replace(/\.md$/i, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
