import { extractHeadings, extractKeywords, extractTitle } from "./markdown";
import type { ContentKind, ContentNode, IndexedDocument } from "./types";

export function classifyPath(path: string): ContentKind {
  if (path.startsWith("coding-test/")) return "other";
  if (path.endsWith("/README.md") || path === "README.md") return "readme";
  if (path.includes("/notes/") && path.endsWith(".md")) return "note";
  if (path.includes("/theory/") && path.endsWith(".md")) return "theory";
  return "other";
}

export function indexMarkdownDocument(input: { path: string; body: string }): IndexedDocument {
  return {
    path: input.path,
    title: extractTitle(input.body),
    kind: classifyPath(input.path),
    headings: extractHeadings(input.body),
    body: input.body,
    keywords: extractKeywords(input.body),
  };
}

export function treeFromPaths(paths: string[]): ContentNode {
  const root: ContentNode = {
    name: "TIL",
    path: "",
    type: "directory",
    kind: "other",
    children: [],
  };

  for (const path of [...paths].sort()) {
    const segments = path.split("/");
    let cursor = root;
    let currentPath = "";

    for (const [index, segment] of segments.entries()) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isFile = index === segments.length - 1;
      cursor.children ??= [];
      let child = cursor.children.find((node) => node.name === segment);

      if (!child) {
        child = {
          name: segment,
          path: currentPath,
          type: isFile ? "file" : "directory",
          kind: isFile ? classifyPath(currentPath) : "other",
          children: isFile ? undefined : [],
        };
        cursor.children.push(child);
      }

      cursor = child;
    }
  }

  return root;
}
