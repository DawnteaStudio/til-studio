import type { IndexedDocument } from "@/lib/content/types";

interface DocumentViewProps {
  document: IndexedDocument;
}

export function DocumentView({ document }: DocumentViewProps) {
  return (
    <article className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 text-zinc-950 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-2 text-sm text-zinc-600">
        <a href="/map" className="font-medium text-zinc-950">
          상위로 이동
        </a>
        {document.headings.map((heading) => (
          <a key={heading} href={`#${heading.replace(/\s+/g, "-")}`} className="block">
            {heading}
          </a>
        ))}
      </aside>
      <main className="max-w-none">
        <h1 className="mb-4 text-2xl font-semibold">{document.title}</h1>
        <pre className="whitespace-pre-wrap rounded border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6">
          {document.body}
        </pre>
      </main>
    </article>
  );
}
