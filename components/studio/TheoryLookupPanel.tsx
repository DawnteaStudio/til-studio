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
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-[#f4efe4]">Theory Lookup</h2>
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="h-11 w-full rounded-2xl bg-[#34382b] px-4 text-sm text-[#f4efe4] outline-none placeholder:text-[#918a79] focus:ring-4 focus:ring-[#769269]/30"
        placeholder="정리할 개념 키워드를 입력하세요"
      />
      <button
        type="button"
        className="w-full rounded-2xl bg-[#34382b] px-3 py-3 text-sm font-medium text-[#ece4d3]"
        onClick={onSearch}
      >
        기존 theory 조회
      </button>
      <button
        type="button"
        className="w-full rounded-2xl bg-[#d8c69a] px-3 py-3 text-sm font-semibold text-[#1e2118]"
        onClick={onCreateTheory}
      >
        새 theory 생성
      </button>
    </section>
  );
}
