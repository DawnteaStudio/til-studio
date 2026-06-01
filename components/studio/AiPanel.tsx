interface AiPanelProps {
  onCleanup(): void;
  onFindMissing(): void;
  isBusy: boolean;
}

export function AiPanel({ onCleanup, onFindMissing, isBusy }: AiPanelProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/60">
      <h2 className="text-sm font-semibold text-zinc-950">AI Actions</h2>
      <button
        type="button"
        className="w-full rounded-xl bg-zinc-950 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        disabled={isBusy}
        onClick={onCleanup}
      >
        notes 형식으로 다듬기
      </button>
      <button
        type="button"
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-50"
        disabled={isBusy}
        onClick={onFindMissing}
      >
        빠진 섹션 찾기
      </button>
    </section>
  );
}
