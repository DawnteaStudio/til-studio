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

export function extractTitle(markdown: string): string {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return title ?? "Untitled";
}

export function extractHeadings(markdown: string): string[] {
  return extractHeadingAnchors(markdown).map((heading) => heading.text);
}

export function extractHeadingAnchors(markdown: string): HeadingAnchor[] {
  const tree = parser.parse(markdown) as Root;
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
