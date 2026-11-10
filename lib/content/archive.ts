import { encodeMarkdownPath } from "./markdown-path";

export interface ArchiveArticle {
  path: string;
  title: string;
  kind: "note" | "theory";
  area: string;
  topic: string;
  source: string | null;
  created: string | null;
  updated: string | null;
  headings: string[];
}

export interface Practice {
  topicPath: string;
  source: string;
  slug: string;
}

const chapterOrder = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });

export function compareChapters(left: ArchiveArticle, right: ArchiveArticle) {
  return chapterOrder.compare(left.path, right.path);
}

export function sortByRecent(articles: readonly ArchiveArticle[]) {
  return [...articles].sort((a, b) =>
    (b.created ?? b.updated ?? "").localeCompare(a.created ?? a.updated ?? "") || compareChapters(a, b),
  );
}

export function articleHref(path: string) {
  return `/docs/${encodeMarkdownPath(path)}`;
}

export function practiceHref({ topicPath, source, slug }: Practice) {
  return `/studio?${new URLSearchParams({ topic: topicPath, source, practice: slug })}`;
}
