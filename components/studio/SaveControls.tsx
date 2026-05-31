import type { SaveMode } from "@/lib/content/types";

interface SaveControlsProps {
  mode: SaveMode;
  onModeChange(mode: SaveMode): void;
  onSave(): void;
}

export function SaveControls({ mode, onModeChange, onSave }: SaveControlsProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-zinc-950">Save</h2>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={
            mode === "quick"
              ? "rounded bg-zinc-950 px-3 py-2 text-sm text-white"
              : "rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
          }
          onClick={() => onModeChange("quick")}
        >
          Quick
        </button>
        <button
          type="button"
          className={
            mode === "review"
              ? "rounded bg-zinc-950 px-3 py-2 text-sm text-white"
              : "rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
          }
          onClick={() => onModeChange("review")}
        >
          Review
        </button>
      </div>
      <button
        type="button"
        className="w-full rounded bg-zinc-950 px-3 py-2 text-sm text-white"
        onClick={onSave}
      >
        GitHub 저장
      </button>
    </section>
  );
}
