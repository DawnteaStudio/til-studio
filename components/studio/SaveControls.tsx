import type { SaveMode } from "@/lib/content/types";

interface SaveControlsProps {
  mode: SaveMode;
  branch?: string;
  onModeChange(mode: SaveMode): void;
  onSave(): void;
  showQuick?: boolean;
  disabled?: boolean;
  busy?: boolean;
}

export function SaveControls({ mode, branch, onModeChange, onSave, showQuick = true, disabled, busy }: SaveControlsProps) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2" disabled={busy}>
        <legend className="mb-2 text-sm font-semibold">저장 방식</legend>
        {(showQuick ? (["quick", "review"] as const) : (["review"] as const)).map((option) => (
          <label key={option} className="flex min-h-11 items-center gap-3 rounded-xl border border-[#204a78]/20 bg-white/55 px-3 py-2 text-sm font-semibold">
            <input type="radio" name="studio-publish-mode" checked={mode === option} onChange={() => onModeChange(option)} />
            {option === "quick" ? `${branch || "기본 브랜치"}에 바로 저장` : "검토용 초안 PR 만들기"}
          </label>
        ))}
      </fieldset>
      <button type="button" disabled={disabled || busy} onClick={onSave}
        className="studio-action min-h-12 w-full rounded-2xl bg-[#204a78] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "저장 중…" : "GitHub에 저장"}
      </button>
    </div>
  );
}
