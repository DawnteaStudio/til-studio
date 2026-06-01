interface TheoryLookupPanelProps {
  query: string;
  onQueryChange(query: string): void;
  onSearch(): void;
  onCreateTheory(): void;
}

export function TheoryLookupPanel({
  query,
  onQueryChange,
  onSearch,
  onCreateTheory,
}: TheoryLookupPanelProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/60">
      <h2 className="text-sm font-semibold text-zinc-950">Theory Lookup</h2>
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100"
        placeholder="정리할 개념 키워드를 입력하세요"
      />
      <button
        type="button"
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800"
        onClick={onSearch}
      >
        기존 theory 조회
      </button>
      <button
        type="button"
        className="w-full rounded-xl bg-zinc-950 px-3 py-2.5 text-sm font-medium text-white"
        onClick={onCreateTheory}
      >
        새 theory 생성
      </button>
    </section>
  );
}
