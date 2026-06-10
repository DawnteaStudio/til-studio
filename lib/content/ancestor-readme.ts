import { encodeMarkdownPath } from "./markdown-path";

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
    if (!child || remaining.length === 0) continue;
    if (structuralDirectories.has(child)) continue;
    if (!directoryPath && rootInfrastructureDirectories.has(child)) continue;
    children.add(child);
  }

  return [...children].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

export function upsertAncestorReadme(input: {
  directoryPath: string;
  existingContent?: string | null;
  repositoryPaths: string[];
}): string {
  const current = input.existingContent?.trimEnd() || createMinimalReadme(input.directoryPath);
  const base = removeLegacyChildIndex(current);
  const block = renderChildrenBlock(
    directChildDirectories(input.directoryPath, input.repositoryPaths),
  );
  const startCount = count(base, childrenStart);
  const endCount = count(base, childrenEnd);

  if (startCount !== endCount || startCount > 1) {
    throw new Error("managed child-index markers are malformed");
  }

  if (startCount === 1) {
    const start = base.indexOf(childrenStart);
    const end = base.indexOf(childrenEnd) + childrenEnd.length;
    return `${base.slice(0, start)}${block}${base.slice(end)}`.trimEnd() + "\n";
  }

  return `${base.trimEnd()}\n\n${block}\n`;
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

function renderChildrenBlock(children: string[]): string {
  const lines = [childrenStart, "## 하위 항목", ""];

  if (children.length) {
    for (const child of children) {
      lines.push(`- [${child}](${encodeMarkdownPath(`${child}/`)})`);
    }
  } else {
    lines.push("아직 등록된 하위 항목이 없습니다.");
  }

  lines.push(childrenEnd);
  return lines.join("\n");
}

function removeLegacyChildIndex(content: string): string {
  return content
    .replace(
      /\n(?:---\n\n)?## 언어 목록\n[\s\S]*?(?=\n(?:---\n\n)?## |\s*$)/,
      "",
    )
    .replace(
      /\n(?:---\n\n)?## 주제 목록\n[\s\S]*?(?=\n(?:---\n\n)?## |\s*$)/,
      "",
    )
    .trimEnd();
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
