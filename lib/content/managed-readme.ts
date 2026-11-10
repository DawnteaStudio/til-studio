export type ManagedSection = "learning-log" | "index" | "children";

export class ManagedReadmeError extends Error {}

export function managedRange(content: string, section: ManagedSection) {
  const first = `<!-- til-studio:${section}:start -->`;
  const last = `<!-- til-studio:${section}:end -->`;
  const start = content.indexOf(first);
  const end = content.indexOf(last);
  if (start === -1 && end === -1) return null;
  if (start === -1 || end < start || start !== content.lastIndexOf(first) || end !== content.lastIndexOf(last)) {
    throw new ManagedReadmeError(`README의 ${section} 시작·끝 마커를 한 쌍으로 복구하세요.`);
  }
  return { start, end: end + last.length };
}

export function upsertManagedSection(content: string, section: ManagedSection, block: string) {
  const range = managedRange(content, section);
  if (range) return content.slice(0, range.start) + block + content.slice(range.end);
  const gap = content === "" || /\n\r?\n$/.test(content) ? "" : content.endsWith("\n") ? "\n" : "\n\n";
  return content + gap + block + "\n";
}

export function unmanagedReadme(content: string, section: ManagedSection) {
  const range = managedRange(content, section);
  if (!range) return null;
  return (content.slice(0, range.start) + content.slice(range.end))
    .replace(/\r\n?/g, "\n").split("\n").map((line) => line.trimEnd()).join("\n").trimEnd();
}

export function escapeLinkLabel(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

export function isArticleFilename(name: string) {
  return /^[^/]+\.md$/.test(name) && !/^readme(?:[._-].*)?\.md$/i.test(name);
}
