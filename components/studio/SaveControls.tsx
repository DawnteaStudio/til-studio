import type { SaveMode } from "@/lib/content/types";

interface SaveControlsProps {
  mode: SaveMode;
  onModeChange(mode: SaveMode): void;
  onSave(): void;
}

export function SaveControls({ mode, onModeChange, onSave }: SaveControlsProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-[#f4efe4]">Save</h2>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={
            mode === "quick"
              ? "rounded-2xl bg-[#d8c69a] px-3 py-2.5 text-sm font-semibold text-[#1e2118]"
              : "rounded-2xl bg-[#34382b] px-3 py-2.5 text-sm font-medium text-[#ece4d3]"
          }
          onClick={() => onModeChange("quick")}
        >
          Quick
        </button>
        <button
          type="button"
          className={
            mode === "review"
              ? "rounded-2xl bg-[#d8c69a] px-3 py-2.5 text-sm font-semibold text-[#1e2118]"
              : "rounded-2xl bg-[#34382b] px-3 py-2.5 text-sm font-medium text-[#ece4d3]"
          }
          onClick={() => onModeChange("review")}
        >
          Review
        </button>
      </div>
      <button
        type="button"
        className="w-full rounded-2xl bg-[#31513a] px-3 py-3.5 text-sm font-semibold text-[#f6efe2] shadow-[0_18px_34px_rgba(0,0,0,0.22)] transition hover:bg-[#3b6046]"
        onClick={onSave}
      >
        Publish to GitHub
      </button>
    </section>
  );
}
