import type { SaveMode } from "@/lib/content/types";

interface SaveControlsProps {
  mode: SaveMode;
  onModeChange(mode: SaveMode): void;
  onSave(): void;
  showQuick?: boolean;
}

export function SaveControls({ mode, onModeChange, onSave, showQuick = true }: SaveControlsProps) {
  return (
    <section className="studio-panel space-y-3 rounded-[1.75rem] p-4">
      <h2 className="text-sm font-semibold text-[#f4efe4]">Save</h2>
      <div className={showQuick ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
        {showQuick ? (
          <button
            type="button"
            className={
              mode === "quick"
                ? "studio-action rounded-2xl bg-[#ff34ff] px-3 py-2.5 text-sm font-semibold text-[#111827]"
                : "studio-chip rounded-2xl px-3 py-2.5 text-sm font-medium text-[#ece4d3]"
            }
            onClick={() => onModeChange("quick")}
          >
            Quick
          </button>
        ) : null}
        <button
          type="button"
          className={
            mode === "review"
              ? "studio-action rounded-2xl bg-[#5de7ff] px-3 py-2.5 text-sm font-semibold text-[#111827]"
              : "studio-chip rounded-2xl px-3 py-2.5 text-sm font-medium text-[#ece4d3]"
          }
          onClick={() => onModeChange("review")}
        >
          Review
        </button>
      </div>
      <button
        type="button"
        className="studio-action w-full rounded-2xl bg-[#204a78] px-3 py-3.5 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(32,74,120,0.3)]"
        onClick={onSave}
      >
        GitHub에 저장
      </button>
    </section>
  );
}
