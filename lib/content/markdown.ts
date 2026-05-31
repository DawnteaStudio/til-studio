export function extractTitle(markdown: string): string {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return title ?? "Untitled";
}

export function extractHeadings(markdown: string): string[] {
  return [...markdown.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
}

export function extractKeywords(markdown: string): string[] {
  const title = extractTitle(markdown);
  const headings = extractHeadings(markdown);
  const words = markdown
    .replace(/[#()[\]`*_>-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);

  return [...new Set([title, ...headings, ...words])];
}
