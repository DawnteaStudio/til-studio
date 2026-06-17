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
    <main className="public-shell text-[#f7f4ea]">
      <div className="public-frame py-6 sm:py-8">
        <nav className="public-nav rounded-full px-4 py-3 sm:px-5">
          <Link href="/" className="text-base font-semibold sm:text-lg">til-studio</Link>
          <div className="flex gap-2 text-sm text-[#d6d0c6]">
            <Link href="/blog" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">Blog</Link>
            <Link href="/studio" className="rounded-full bg-white/10 px-3 py-2 transition hover:bg-[#ffd36a] hover:text-[#080b12]">
              Studio
            </Link>
          </div>
        </nav>

        <header className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase text-[#c7f05a]">
              {owner}/{repo} · {branch}
            </p>
            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal text-white sm:text-7xl">
              Learning Map
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#d8d0bd]">
              연결된 TIL 저장소의 Markdown 구조를 주제 보드로 재구성합니다. guide 파일은 지도에서 빠지고,
              notes와 theory만 실제 학습 흐름으로 묶입니다.
            </p>
          </div>
          <div className="public-glass rounded-[2rem] p-4">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Articles" value={stats.total} />
              <Metric label="notes" value={stats.note} />
              <Metric label="theory" value={stats.theory} />
            </div>
            <a
              href={`https://github.com/${owner}/${repo}/tree/${branch}`}
              className="public-action mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#ffd36a] px-4 text-sm font-bold text-[#080b12]"
            >
              Open Repository
            </a>
          </div>
        </header>

        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-8">
            {areas.map((area, index) => (
              <AreaSection
                key={area.key}
                area={area}
                topics={summarizeArea(articleDocuments, area.key)}
                index={index}
              />
            ))}
          </section>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <section className="public-glass rounded-[2rem] p-4">
              <h2 className="text-sm font-bold text-white">Repository Index</h2>
              <div className="mt-4 space-y-2">
                {topLevel.map((node, index) => (
                  <div
                    key={node.path}
                    className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-medium text-white">
                      <span className="font-mono text-[0.68rem] text-[#9cecff]">{String(index + 1).padStart(2, "0")}</span>
                      <span className="truncate">{node.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[#c8c0b1]">{countArticles(node)} articles</span>
                  </div>
                ))}
              </div>
            </section>

            {rootDocuments.length ? (
              <section className="public-glass rounded-[2rem] p-4">
                <h2 className="text-sm font-bold text-white">Root Documents</h2>
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
    </main>
  );
}

function AreaSection({
  area,
  topics,
  index,
}: {
  area: (typeof areas)[number];
  topics: TopicSummary[];
  index: number;
}) {
  const documentCount = topics.reduce((sum, topic) => sum + topic.documents.length, 0);

  return (
    <section className={`public-glass rounded-[2rem] ${index % 2 ? "xl:ml-14" : "xl:mr-14"}`}>
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${area.accent}`}>
              {area.key}
            </span>
            <h2 className="text-xl font-black text-white">{area.label}</h2>
          </div>
          <p className="mt-2 text-sm text-[#d8d0bd]">{area.description}</p>
        </div>
        <div className="font-mono text-xs text-[#9cecff]">
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
        <div className="px-5 py-8 text-sm text-[#c8c0b1]">No Markdown files found in this area.</div>
      )}
    </section>
  );
}

function TopicCard({ topic }: { topic: TopicSummary }) {
  const visibleDocs = topic.documents.slice(0, 4);
  const extraCount = topic.documents.length - visibleDocs.length;

  return (
    <article className="public-stream-card rounded-[1.35rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-white">{topic.name}</h3>
          <p className="mt-1 break-all font-mono text-xs text-[#c8c0b1]">{topic.path}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#ffd36a] px-2 py-1 text-xs font-black text-[#080b12]">
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
          <p className="pt-1 text-xs text-[#c8c0b1]">+ {extraCount} more files in this topic</p>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-[#080b12]/45 px-4 py-3">
      <p className="text-xs font-medium uppercase text-[#c8c0b1]">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-white/[0.07] px-2 py-1 text-xs font-medium text-[#d8d0bd]">
      {label} {value}
    </span>
  );
}

function DocumentLink({ document }: { document: DocumentSummary }) {
  return (
    <Link
      href={`/docs/${document.path}`}
      className="flex items-center justify-between gap-3 rounded-full bg-white/[0.07] px-3 py-2 text-sm hover:bg-white/[0.12]"
    >
      <span className="min-w-0 truncate text-white">{document.title}</span>
      <span className="shrink-0 rounded-full bg-[#ffd36a] px-2 py-0.5 text-xs text-[#080b12]">
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
