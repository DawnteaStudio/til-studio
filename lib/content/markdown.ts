import GithubSlugger from "github-slugger";
import type { Heading, Root, RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const parser = unified().use(remarkParse).use(remarkGfm);

export interface HeadingAnchor {
  depth: number;
  id: string;
  text: string;
}

const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function stripFrontmatter(markdown: string): string {
  return markdown.replace(frontmatter, "");
}

export function noteCreatedDate(markdown: string): string | null {
  const header = frontmatter.exec(markdown)?.[1];
  return header?.match(/^created:[ \t]*["']?(\d{4}-\d{2}-\d{2})["']?[ \t]*\r?$/m)?.[1] ?? null;
}

export function extractDocumentOutline(markdown: string) {
  const tree = parser.parse(stripFrontmatter(markdown)) as Root;
  const nodes = tree.children.filter((node): node is Heading => node.type === "heading");
  const first = nodes.find((node) => node.depth <= 2);
  return {
    title: first ? plainText(first).trim() : "",
    headings: nodes.filter((node) => node !== first).map((node) => plainText(node).trim()).filter(Boolean),
  };
}

export function extractTitle(markdown: string): string {
  return extractDocumentOutline(markdown).title || "Untitled";
}

export function extractHeadings(markdown: string): string[] {
  return extractHeadingAnchors(markdown).map((heading) => heading.text);
}

export function extractHeadingAnchors(markdown: string): HeadingAnchor[] {
  const tree = parser.parse(stripFrontmatter(markdown)) as Root;
  const slugger = new GithubSlugger();

  return tree.children
    .filter((node): node is Heading => node.type === "heading" && node.depth > 1)
    .map((heading) => {
      const text = plainText(heading).trim();

      return {
        depth: heading.depth,
        id: slugger.slug(text),
        text,
      };
    })
    .filter((heading) => heading.text.length > 0);
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

function plainText(node: RootContent | Heading): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  if ("children" in node) {
    return node.children.map((child) => plainText(child as RootContent)).join("");
  }

  return "";
}
