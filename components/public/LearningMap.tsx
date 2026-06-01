import Link from "next/link";
import { classifyPath } from "@/lib/content/indexer";
import type { ContentKind, ContentNode } from "@/lib/content/types";

interface LearningMapProps {
  tree: ContentNode;
  paths: string[];
  owner: string;
  repo: string;
  branch: string;
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
  readmes: number;
}

const areas: Array<{ key: AreaKey; label: string; description: string; accent: string }> = [
  {
    key: "cs",
    label: "Computer Science",
    description: "Core CS topics, concepts, and lecture notes.",
    accent: "border-sky-300 bg-sky-50 text-sky-800",
  },
  {
    key: "languages",
    label: "Languages",
    description: "Language-specific notes, syntax, runtime behavior, and patterns.",
    accent: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  {
    key: "projects",
    label: "Projects",
    description: "Project experience, implementation notes, and retrospectives.",
    accent: "border-amber-300 bg-amber-50 text-amber-800",
  },
  {
    key: "coding-test",
    label: "Coding Test",
    description: "Problem solving records kept separate from study notes.",
    accent: "border-zinc-300 bg-zinc-100 text-zinc-700",
  },
];

const kindLabels: Record<ContentKind, string> = {
  note: "note",
  theory: "theory",
  readme: "README",
  other: "doc",
};

export function LearningMap({ tree, paths, owner, repo, branch }: LearningMapProps) {
  const documents = paths.map(toDocument);
  const stats = summarizeDocuments(documents);
  const topLevel = tree.children ?? [];
  const rootDocuments = documents.filter((doc) => !doc.path.includes("/"));

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 grid gap-5 border-b border-zinc-200 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {owner}/{repo} · {branch}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-950 sm:text-4xl">Learning Map</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            The map is generated from the live Markdown structure of the connected TIL repository.
            notes, theory, README files, and coding-test records are grouped exactly from repo paths.
          </p>
        </div>
        <a
          href={`https://github.com/${owner}/${repo}/tree/${branch}`}
          className="inline-flex h-10 items-center justify-center rounded border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm hover:border-zinc-400"
        >
          Open Repository
        </a>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Markdown files" value={stats.total} />
        <Metric label="notes" value={stats.note} />
        <Metric label="theory" value={stats.theory} />
        <Metric label="README" value={stats.readme} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          {areas.map((area) => (
            <AreaSection
              key={area.key}
              area={area}
              topics={summarizeArea(documents, area.key)}
            />
          ))}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-950">Repository Index</h2>
            <div className="mt-4 space-y-2">
              {topLevel.map((node) => (
                <div
                  key={node.path}
                  className="flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-800">{node.name}</span>
                  <span className="text-xs text-zinc-500">{countMarkdown(node)} files</span>
                </div>
              ))}
            </div>
          </section>

          {rootDocuments.length ? (
            <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-950">Root Documents</h2>
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
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded border px-2 py-1 text-xs font-semibold ${area.accent}`}>
              {area.key}
            </span>
            <h2 className="text-lg font-semibold text-zinc-950">{area.label}</h2>
          </div>
          <p className="mt-2 text-sm text-zinc-600">{area.description}</p>
        </div>
        <div className="text-sm text-zinc-500">
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
        <div className="px-5 py-8 text-sm text-zinc-500">No Markdown files found in this area.</div>
      )}
    </section>
  );
}

function TopicCard({ topic }: { topic: TopicSummary }) {
  const visibleDocs = topic.documents.slice(0, 4);
  const extraCount = topic.documents.length - visibleDocs.length;

  return (
    <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-zinc-950">{topic.name}</h3>
          <p className="mt-1 break-all font-mono text-xs text-zinc-500">{topic.path}</p>
        </div>
        <span className="shrink-0 rounded bg-white px-2 py-1 text-xs font-medium text-zinc-600">
          {topic.documents.length}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill label="README" value={topic.readmes} />
        <StatusPill label="notes" value={topic.notes} />
        <StatusPill label="theory" value={topic.theory} />
      </div>

      <div className="mt-4 space-y-2">
        {visibleDocs.map((doc) => (
          <DocumentLink key={doc.path} document={doc} />
        ))}
        {extraCount > 0 ? (
          <p className="pt-1 text-xs text-zinc-500">+ {extraCount} more files in this topic</p>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600">
      {label} {value}
    </span>
  );
}

function DocumentLink({ document }: { document: DocumentSummary }) {
  return (
    <Link
      href={`/docs/${document.path}`}
      className="flex items-center justify-between gap-3 rounded border border-zinc-200 bg-white px-3 py-2 text-sm hover:border-zinc-300 hover:bg-zinc-50"
    >
      <span className="min-w-0 truncate text-zinc-800">{document.title}</span>
      <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
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
      readmes: 0,
    };

    topic.documents.push(document);
    if (document.kind === "note") topic.notes += 1;
    if (document.kind === "theory") topic.theory += 1;
    if (document.kind === "readme") topic.readmes += 1;
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

function toDocument(path: string): DocumentSummary {
  return {
    path,
    title: path.split("/").at(-1)?.replace(/\.md$/, "") ?? path,
    kind: classifyPath(path),
  };
}

function compareDocuments(a: DocumentSummary, b: DocumentSummary) {
  const weight: Record<ContentKind, number> = { readme: 0, theory: 1, note: 2, other: 3 };
  return weight[a.kind] - weight[b.kind] || a.path.localeCompare(b.path);
}

function countMarkdown(node: ContentNode): number {
  if (node.type === "file") return node.path.endsWith(".md") ? 1 : 0;
  return (node.children ?? []).reduce((sum, child) => sum + countMarkdown(child), 0);
}
