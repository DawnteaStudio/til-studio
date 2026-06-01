import type { SaveMode } from "@/lib/content/types";

interface SaveControlsProps {
  mode: SaveMode;
  onModeChange(mode: SaveMode): void;
  onSave(): void;
}

export function SaveControls({ mode, onModeChange, onSave }: SaveControlsProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/60">
      <h2 className="text-sm font-semibold text-zinc-950">Save</h2>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={
            mode === "quick"
              ? "rounded-xl bg-zinc-950 px-3 py-2.5 text-sm font-medium text-white shadow-sm"
              : "rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800"
          }
          onClick={() => onModeChange("quick")}
        >
          Quick
        </button>
        <button
          type="button"
          className={
            mode === "review"
              ? "rounded-xl bg-zinc-950 px-3 py-2.5 text-sm font-medium text-white shadow-sm"
              : "rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800"
          }
          onClick={() => onModeChange("review")}
        >
          Review
        </button>
      </div>
      <button
        type="button"
        className="w-full rounded-xl bg-zinc-950 px-3 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
        onClick={onSave}
      >
        Publish to GitHub
      </button>
    </section>
  );
}
