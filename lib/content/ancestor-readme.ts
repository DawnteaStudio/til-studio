import { encodeMarkdownPath } from "./markdown-path";
import { escapeLinkLabel, isArticleFilename, unmanagedReadme, upsertManagedSection } from "./managed-readme";

const childrenStart = "<!-- til-studio:children:start -->";
const childrenEnd = "<!-- til-studio:children:end -->";
const structuralDirectories = new Set(["notes", "theory", "note", "src"]);
const rootInfrastructureDirectories = new Set([
  ".github",
  ".superpowers",
  "docs",
  "node_modules",
  "scripts",
  "templates",
  "tests",
]);

export function ancestorReadmePath(directoryPath: string): string {
  return directoryPath ? `${directoryPath}/README.md` : "README.md";
}

export function isRemovableAncestorReadme(input: {
  directoryPath: string;
  content: string;
}): boolean {
  if (!input.directoryPath) return false;

  const base = unmanagedReadme(input.content, "children");
  return base === createMinimalReadme(input.directoryPath);
}

export function directChildDirectories(
  directoryPath: string,
  repositoryPaths: string[],
): string[] {
  const prefix = directoryPath ? `${directoryPath}/` : "";
  const children = new Set<string>();

  for (const repositoryPath of repositoryPaths) {
    if (!repositoryPath.startsWith(prefix)) continue;
    const relative = repositoryPath.slice(prefix.length);
    const [child, ...remaining] = relative.split("/");
    if (!child || child.startsWith(".") || remaining.length === 0) continue;
    if (structuralDirectories.has(child)) continue;
    if (!directoryPath && rootInfrastructureDirectories.has(child)) continue;
    children.add(child);
  }

  return [...children].sort();
}

export function upsertAncestorReadme(input: {
  directoryPath: string;
  existingContent?: string | null;
  repositoryPaths: string[];
}): string {
  const current = input.existingContent ?? createMinimalReadme(input.directoryPath);
  const children = directChildDirectories(input.directoryPath, input.repositoryPaths);
  return upsertManagedSection(current, "children", renderChildrenBlock(children, input.directoryPath, input.repositoryPaths));
}

function createMinimalReadme(directoryPath: string): string {
  const title = directoryPath
    ? directoryPath.split("/").at(-1)?.replaceAll("-", " ") || "TIL"
    : "TIL";
  const parentLink = directoryPath
    ? `[상위 README로 이동](${"../".repeat(directoryPath.split("/").length)}README.md)\n\n`
    : "";

  return `${parentLink}# ${title}`;
}

function topicStatus(topicPath: string, paths: string[]) {
  const prefix = topicPath + "/";
  let articles = 0;
  let hasPractice = false;
  for (const path of paths) {
    if (!path.startsWith(prefix)) continue;
    const parts = path.slice(prefix.length).split("/");
    if (parts[0] === "theory" && parts.length === 2 && isArticleFilename(parts[1])) articles++;
    if (parts[0] !== "notes" || parts[1]?.startsWith(".")) continue;
    if (parts[2] === "note" && parts.length === 4 && isArticleFilename(parts[3])) articles++;
    if (parts[2] === "src" && parts.length >= 5 && !parts[3].startsWith(".") && parts.at(-1) !== ".gitkeep") hasPractice = true;
  }
  return articles ? `글 ${articles}편` : hasPractice ? "실습 코드" : "작성 예정";
}

function renderChildrenBlock(children: string[], directoryPath: string, paths: string[]): string {
  const lines = [childrenStart, "## 하위 항목", ""];

  if (children.length) {
    for (const child of children) {
      const status = directoryPath ? ` — ${topicStatus(`${directoryPath}/${child}`, paths)}` : "";
      lines.push(`- [${escapeLinkLabel(child)}](${encodeMarkdownPath(`${child}/`)})${status}`);
    }
  } else {
    lines.push("아직 등록된 하위 항목이 없습니다.");
  }

  lines.push(childrenEnd);
  return lines.join("\n");
}
