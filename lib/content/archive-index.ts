import { type ArchiveArticle, type Practice } from "./archive";
import { classifyPath } from "./indexer";
import { extractDocumentOutline, noteCreatedDate } from "./markdown";
import { linkedPracticeSlugs, parseFrontmatterSourceSlugs } from "./source-readme";
import { deriveStudyTarget } from "./studio-target";

export interface ArchiveFile {
  path: string;
  body: string;
  updated: string | null;
}

export function indexArchive(files: ArchiveFile[], allPaths: string[]) {
  const available = new Map<string, Set<string>>();
  for (const path of allPaths) {
    const match = /^([^/]+\/[^/]+\/notes\/[^/]+)\/src\/([^/]+)\/(.+)$/.exec(path);
    if (!match || !deriveStudyTarget(match[1]) || match[2].startsWith(".") || path.endsWith("/.gitkeep")) continue;
    const slugs = available.get(match[1]) ?? new Set<string>();
    slugs.add(match[2]);
    available.set(match[1], slugs);
  }

  const articles: ArchiveArticle[] = [];
  const linked = new Map<string, Set<string>>();
  for (const { path, body, updated } of files) {
    const kind = classifyPath(path);
    if (kind !== "note" && kind !== "theory") continue;
    const [area, topic, , source] = path.split("/");
    const filename = path.split("/").at(-1)!.replace(/\.md$/i, "");
    const { title, headings } = extractDocumentOutline(body);
    const created = noteCreatedDate(body);
    const series = kind === "note" && path.startsWith(`${area}/${topic}/notes/${source}/`) ? source : null;
    const article: ArchiveArticle = { path, kind, area, topic, source: series, title: title || filename, created, updated, headings };
    articles.push(article);
    if (!series || path !== `${area}/${topic}/notes/${series}/note/${filename}.md`) continue;
    const folder = `${area}/${topic}/notes/${series}`;
    const slugs = available.get(folder) ?? new Set<string>();
    const explicit = parseFrontmatterSourceSlugs(body);
    const pending = explicit.filter((slug) => !slugs.has(slug));
    if (pending.length) article.pendingPractices = pending;
    const used = linked.get(folder) ?? new Set<string>();
    const connected = linkedPracticeSlugs(filename, explicit, slugs);
    if (connected.length) article.linkedPractices = connected;
    for (const slug of connected) used.add(slug);
    linked.set(folder, used);
  }

  const practices: Practice[] = [];
  for (const [folder, slugs] of available) {
    const [area, topic, , source] = folder.split("/");
    for (const slug of slugs) {
      if (!linked.get(folder)?.has(slug)) practices.push({ topicPath: `${area}/${topic}`, source, slug });
    }
  }
  return { articles, practices };
}
