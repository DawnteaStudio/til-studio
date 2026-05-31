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
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-zinc-950">Theory Lookup</h2>
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-950"
        placeholder="transactional rollback checked exception"
      />
      <button
        type="button"
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
        onClick={onSearch}
      >
        기존 theory 조회
      </button>
      <button
        type="button"
        className="w-full rounded bg-zinc-950 px-3 py-2 text-sm text-white"
        onClick={onCreateTheory}
      >
        새 theory 생성
      </button>
    </section>
  );
}
