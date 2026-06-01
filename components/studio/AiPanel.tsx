interface AiPanelProps {
  onCleanup(): void;
  isBusy: boolean;
}

export function AiPanel({ onCleanup, isBusy }: AiPanelProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-[#f4efe4]">Note Tools</h2>
      <button
        type="button"
        className="w-full rounded-2xl bg-[#d8c69a] px-3 py-3 text-sm font-semibold text-[#1e2118] disabled:opacity-50"
        disabled={isBusy}
        onClick={onCleanup}
      >
        notes 형식으로 다듬기
      </button>
    </section>
  );
}
