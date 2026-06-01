"use client";

import Link from "next/link";
import { classifyPath } from "@/lib/content/indexer";
import type { ContentKind, ContentNode } from "@/lib/content/types";
import { filterPathsByVisibleRoots, filterTreeByVisibleRoots } from "@/lib/content/visibility";
import { useVisibleRootPaths } from "./useVisibleRootPaths";

interface LearningMapProps {
  tree: ContentNode;
  paths: string[];
  owner: string;
  repo: string;
  branch: string;
  initialVisibleRootPaths?: string[];
}

type AreaKey = "cs" | "languages" | "projects" | "coding-test";

interface DocumentSummary {
  path: string;
  title: string;
  kind: ContentKind;
}

interface TopicSummary {
  name: string;
  path: string;
  documents: DocumentSummary[];
  notes: number;
  theory: number;
}

const areas: Array<{ key: AreaKey; label: string; description: string; accent: string }> = [
  {
    key: "cs",
    label: "Computer Science",
    description: "Core CS topics, concepts, and lecture notes.",
    accent: "bg-[#8aa1c1] text-[#151611]",
  },
  {
    key: "languages",
    label: "Languages",
    description: "Language-specific notes, syntax, runtime behavior, and patterns.",
    accent: "bg-[#9fb88b] text-[#151611]",
  },
  {
    key: "projects",
    label: "Projects",
    description: "Project experience, implementation notes, and retrospectives.",
    accent: "bg-[#d8c69a] text-[#151611]",
  },
  {
    key: "coding-test",
    label: "Coding Test",
    description: "Problem solving records kept separate from study notes.",
    accent: "bg-[#777f68] text-[#f4efe4]",
  },
];

const kindLabels: Record<ContentKind, string> = {
  note: "note",
  theory: "theory",
  readme: "guide",
  other: "doc",
};

export function LearningMap({ tree, paths, owner, repo, branch, initialVisibleRootPaths }: LearningMapProps) {
  const { visibleRootPaths } = useVisibleRootPaths(paths, initialVisibleRootPaths);
  const visiblePaths = filterPathsByVisibleRoots(paths, visibleRootPaths);
  const visibleTree = filterTreeByVisibleRoots(tree, visibleRootPaths);
  const documents = visiblePaths.map(toDocument);
  const articleDocuments = documents.filter(isArticleDocument);
  const stats = summarizeDocuments(articleDocuments);
  const topLevel = (visibleTree.children ?? []).filter((node) => node.type === "directory");
  const rootDocuments = articleDocuments.filter((doc) => !doc.path.includes("/"));

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
      <nav className="mb-12 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-lg font-semibold">til-studio</Link>
        <div className="flex gap-3 text-sm text-[#cec4ae]">
          <Link href="/blog" className="hover:text-[#f4efe4]">Blog</Link>
          <Link href="/studio" className="hover:text-[#f4efe4]">Studio</Link>
        </div>
      </nav>
      <header className="mb-8 grid gap-5 border-b border-[#34382b] pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9da88c]">
            {owner}/{repo} · {branch}
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-[#f4efe4] sm:text-5xl">Learning Map</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c8bea8]">
            The map is generated from the live Markdown structure of the connected TIL repository.
            notes and theory articles are grouped exactly from repo paths, while guide files stay out of the article map.
          </p>
        </div>
        <a
          href={`https://github.com/${owner}/${repo}/tree/${branch}`}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#d8c69a] px-4 text-sm font-semibold text-[#151611]"
        >
          Open Repository
        </a>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Articles" value={stats.total} />
        <Metric label="notes" value={stats.note} />
        <Metric label="theory" value={stats.theory} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          {areas.map((area) => (
            <AreaSection
              key={area.key}
              area={area}
              topics={summarizeArea(articleDocuments, area.key)}
            />
          ))}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-[1.75rem] bg-[#24281e] p-4">
            <h2 className="text-sm font-semibold text-[#f4efe4]">Repository Index</h2>
            <div className="mt-4 space-y-2">
              {topLevel.map((node) => (
                <div
                  key={node.path}
                  className="flex items-center justify-between rounded-2xl bg-[#303629] px-3 py-2 text-sm"
                >
                  <span className="font-medium text-[#f4efe4]">{node.name}</span>
                  <span className="text-xs text-[#9d957f]">{countArticles(node)} articles</span>
                </div>
              ))}
            </div>
          </section>

          {rootDocuments.length ? (
            <section className="rounded-[1.75rem] bg-[#24281e] p-4">
              <h2 className="text-sm font-semibold text-[#f4efe4]">Root Documents</h2>
              <div className="mt-4 space-y-2">
                {rootDocuments.map((doc) => (
                  <DocumentLink key={doc.path} document={doc} />
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function AreaSection({
  area,
  topics,
}: {
  area: (typeof areas)[number];
  topics: TopicSummary[];
}) {
  const documentCount = topics.reduce((sum, topic) => sum + topic.documents.length, 0);

  return (
    <section className="rounded-[1.75rem] bg-[#24281e]">
      <div className="flex flex-col gap-3 border-b border-[#34382b] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${area.accent}`}>
              {area.key}
            </span>
            <h2 className="text-lg font-semibold text-[#f4efe4]">{area.label}</h2>
          </div>
          <p className="mt-2 text-sm text-[#c8bea8]">{area.description}</p>
        </div>
        <div className="text-sm text-[#9d957f]">
          {topics.length} topics · {documentCount} files
        </div>
      </div>

      {topics.length ? (
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {topics.map((topic) => (
            <TopicCard key={topic.path} topic={topic} />
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-sm text-[#9d957f]">No Markdown files found in this area.</div>
      )}
    </section>
  );
}

function TopicCard({ topic }: { topic: TopicSummary }) {
  const visibleDocs = topic.documents.slice(0, 4);
  const extraCount = topic.documents.length - visibleDocs.length;

  return (
    <article className="rounded-[1.5rem] bg-[#303629] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[#f4efe4]">{topic.name}</h3>
          <p className="mt-1 break-all font-mono text-xs text-[#9d957f]">{topic.path}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#d8c69a] px-2 py-1 text-xs font-semibold text-[#151611]">
          {topic.documents.length}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill label="notes" value={topic.notes} />
        <StatusPill label="theory" value={topic.theory} />
      </div>

      <div className="mt-4 space-y-2">
        {visibleDocs.map((doc) => (
          <DocumentLink key={doc.path} document={doc} />
        ))}
        {extraCount > 0 ? (
          <p className="pt-1 text-xs text-[#9d957f]">+ {extraCount} more files in this topic</p>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] bg-[#24281e] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#9d957f]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#f4efe4]">{value}</p>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-[#252a20] px-2 py-1 text-xs font-medium text-[#c8bea8]">
      {label} {value}
    </span>
  );
}

function DocumentLink({ document }: { document: DocumentSummary }) {
  return (
    <Link
      href={`/docs/${document.path}`}
      className="flex items-center justify-between gap-3 rounded-2xl bg-[#252a20] px-3 py-2 text-sm hover:bg-[#3a422f]"
    >
      <span className="min-w-0 truncate text-[#f4efe4]">{document.title}</span>
      <span className="shrink-0 rounded-full bg-[#d8c69a] px-2 py-0.5 text-xs text-[#151611]">
        {kindLabels[document.kind]}
      </span>
    </Link>
  );
}

function summarizeArea(documents: DocumentSummary[], area: AreaKey): TopicSummary[] {
  const topics = new Map<string, TopicSummary>();

  for (const document of documents) {
    if (!document.path.startsWith(`${area}/`)) continue;

    const segments = document.path.split("/");
    const topicName = segments[1] ?? "root";
    const topicPath = `${area}/${topicName}`;
    const topic = topics.get(topicPath) ?? {
      name: topicName,
      path: topicPath,
      documents: [],
      notes: 0,
      theory: 0,
    };

    topic.documents.push(document);
    if (document.kind === "note") topic.notes += 1;
    if (document.kind === "theory") topic.theory += 1;
    topics.set(topicPath, topic);
  }

  return [...topics.values()]
    .map((topic) => ({
      ...topic,
      documents: topic.documents.sort(compareDocuments),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function summarizeDocuments(documents: DocumentSummary[]) {
  return documents.reduce(
    (stats, document) => {
      stats.total += 1;
      stats[document.kind] += 1;
      return stats;
    },
    { total: 0, note: 0, theory: 0, readme: 0, other: 0 },
  );
}

function isArticleDocument(document: DocumentSummary) {
  return document.kind === "note" || document.kind === "theory";
}

function toDocument(path: string): DocumentSummary {
  return {
    path,
    title: path.split("/").at(-1)?.replace(/\.md$/, "") ?? path,
    kind: classifyPath(path),
  };
}

function compareDocuments(a: DocumentSummary, b: DocumentSummary) {
  const weight: Record<ContentKind, number> = { theory: 1, note: 2, readme: 3, other: 4 };
  return weight[a.kind] - weight[b.kind] || a.path.localeCompare(b.path);
}

function countArticles(node: ContentNode): number {
  if (node.type === "file") {
    const kind = classifyPath(node.path);
    return kind === "note" || kind === "theory" ? 1 : 0;
  }

  return (node.children ?? []).reduce((sum, child) => sum + countArticles(child), 0);
}
