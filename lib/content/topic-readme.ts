import { encodeMarkdownPath } from "./markdown-path";
import { escapeLinkLabel, isArticleFilename, unmanagedReadme, upsertManagedSection } from "./managed-readme";

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

export function isRemovableTopicReadme(input: {
  topicPath: string;
  content: string;
}): boolean {
  const base = unmanagedReadme(input.content, "index");
  return base === createTopicReadmeBase(input.topicPath);
}

export function upsertTopicReadmeIndex(input: {
  topicPath: string;
  existingContent?: string | null;
  documentPaths: string[];
  theoryTitles?: ReadonlyMap<string, string>;
}): string {
  const base = input.existingContent ?? createTopicReadmeBase(input.topicPath);
  return upsertManagedSection(base, "index", renderIndexBlock(input.topicPath, input.documentPaths, input.theoryTitles));
}

export function theoryPathsForTopic(topicPath: string, paths: string[]) {
  const prefix = topicPath + "/theory/";
  return paths.filter((path) => path.startsWith(prefix) && isArticleFilename(path.slice(prefix.length))).sort();
}

function renderIndexBlock(topicPath: string, documentPaths: string[], titles?: ReadonlyMap<string, string>): string {
  const noteSources = new Set<string>();
  const theories = theoryPathsForTopic(topicPath, documentPaths);

  for (const path of documentPaths) {
    if (!path.startsWith(`${topicPath}/`)) continue;
    const relative = path.slice(topicPath.length + 1);
    const segments = relative.split("/");

    if (segments[0] === "notes" && segments.length >= 3 && !segments[1].startsWith(".")) {
      noteSources.add(segments[1]);
    }

  }

  const lines = [indexStart, "## Notes"];
  if (noteSources.size) {
    for (const source of [...noteSources].sort()) {
      lines.push(`- [${escapeLinkLabel(source)}](${encodeMarkdownPath(`notes/${source}/`)})`);
    }
  } else {
    lines.push("", "아직 등록된 note가 없습니다.");
  }

  lines.push("", "## Theory");
  if (theories.length) {
    for (const path of theories) {
      const relative = path.slice(topicPath.length + 1);
      lines.push(`- [${escapeLinkLabel(titles?.get(path) || titleFromFilePath(path))}](${encodeMarkdownPath(relative)})`);
    }
  } else {
    lines.push("", "아직 등록된 theory가 없습니다.");
  }

  lines.push(indexEnd);
  return lines.join("\n");
}

function titleFromTopicPath(path: string): string {
  const slug = path.split("/").at(-1) ?? "TIL";
  if (slug.toLowerCase() === "ai") return "AI";
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function createTopicReadmeBase(topicPath: string): string {
  const topicSlug = topicPath.split("/").at(-1) ?? "topic";
  const title = titleFromTopicPath(topicPath);

  return [
    "[상위 README로 이동](../README.md)",
    `# ${title}`,
    `${title} 관련 개념과 학습 기록을 정리합니다.`,
    "---",
    "## 구조",
    "```text",
    `${topicSlug}/`,
    "├── README.md",
    "├── theory/    # 정제된 개념",
    "└── notes/     # 강의/책/학습 중 작성한 기록",
    "```",
  ].join("\n\n");
}

function titleFromFilePath(path: string): string {
  return (path.split("/").at(-1) ?? path).replace(/\.md$/i, "");
}
