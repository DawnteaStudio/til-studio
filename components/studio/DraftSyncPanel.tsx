"use client";

import { useId, useState, type ChangeEvent } from "react";
import { draftToNoteMarkdown } from "@/lib/content/note-draft";
import { exportDraft, maxDraftBytes, type StudioDraft } from "@/lib/content/studio-draft";
import type { DraftSnapshot } from "./cloud-draft-store";

type Store = DraftSnapshot & {
  retry(): Promise<void> | void;
  resolveConflict(choice: "local" | "remote"): Promise<void> | void;
  importDraft(raw: string): void;
  exportDraft(): string;
};

function timestamp(value: number | string) {
  return new Date(value).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function DraftSyncStatus({ store }: { store: DraftSnapshot }) {
  if (store.storageError) return <span role="alert">기기 저장 실패 · 초안을 파일로 내보내 보관하세요</span>;
  if (store.cloudStatus === "local") {
    return <span>{store.savedAt ? `이 기기에 자동 저장됨 · ${timestamp(store.savedAt)}` : "작성하면 이 기기에 자동 저장됩니다"}</span>;
  }
  const status = {
    loading: "서버 초안 불러오는 중",
    idle: "작성하면 서버와 이 기기에 자동 저장됩니다",
    pending: "이 기기에 보관됨 · 서버 저장 대기",
    saving: "이 기기에 보관됨 · 서버 저장 중",
    saved: store.cloudSavedAt ? `서버에 저장됨 · ${timestamp(store.cloudSavedAt)}` : "서버에 저장됨",
    offline: "서버 연결 대기 · 이 기기에 보관 중",
    conflict: "다른 기기의 변경 내용을 확인하세요",
    error: "서버 저장을 확인하세요",
  }[store.cloudStatus];
  return <span role={store.cloudStatus === "conflict" ? "alert" : "status"}>{status}</span>;
}

function preview(draft: StudioDraft | null) {
  if (!draft) return "서버에서 새 초안을 시작한 상태입니다.";
  if (draft.draftKind === "theory") return draft.theoryMarkdown || "(내용 없음)";
  // Learning notes always link to their source README one directory above note/.
  const generated = draftToNoteMarkdown({ ...draft.noteDraft, parentHref: "../README.md" });
  const markdown = draft.noteVersion?.base === generated ? draft.noteVersion.markdown : generated;
  return markdown || "(빈 편집본)";
}

function download(content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "til-studio-draft-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DraftSyncPanel({ store, hosted }: { store: Store; hosted: boolean }) {
  const inputId = useId();
  const [message, setMessage] = useState("");
  const button = "inline-flex min-h-11 items-center rounded-lg border border-[#204a78]/30 px-3 py-2 text-sm font-semibold text-[#204a78] disabled:opacity-50";

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > maxDraftBytes) throw new Error("초안 파일은 1MB 이하로 가져올 수 있습니다.");
      if (!hosted && store.savedAt !== null && !window.confirm("현재 초안을 가져온 파일로 바꿀까요? 필요한 내용은 먼저 내보내세요.")) return;
      store.importDraft(await file.text());
      setMessage(hosted ? "가져온 초안을 확인하세요. 서버에 초안이 있으면 아래에서 선택할 수 있습니다." : "초안을 가져왔습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "초안 파일을 읽지 못했습니다.");
    }
  }

  function recover(draft: StudioDraft) {
    try {
      store.importDraft(exportDraft(draft));
      setMessage("기기에 보관된 초안을 불러왔습니다.");
    } catch {
      setMessage("초안을 불러오지 못했습니다. 파일로 내보내 보관하세요.");
    }
  }

  return (
    <section aria-label="초안 동기화와 가져오기" className="my-3 min-w-0 space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={button} onClick={() => download(store.exportDraft())}>초안 내보내기</button>
        <label htmlFor={inputId} className={button + " cursor-pointer"}>초안 가져오기</label>
        <input id={inputId} aria-label="초안 JSON 가져오기" type="file" accept=".json,application/json" onChange={importFile} className="sr-only" />
        {hosted && ["offline", "error"].includes(store.cloudStatus) && (
          <button type="button" className={button} onClick={() => { void store.retry(); }}>서버 동기화 재시도</button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      {hosted && store.cloudError && <p role="alert">{store.cloudError}</p>}
      {hosted && store.recoveries.length > 0 && (
        <details className="rounded-xl border border-[#204a78]/20 bg-white/60 p-3">
          <summary className="cursor-pointer font-semibold">이 기기에 보관된 초안 {store.recoveries.length}개</summary>
          <ul className="mt-2 space-y-3">
            {store.recoveries.map((recovery) => (
              <li key={recovery.key} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 break-words">{recovery.draft.noteDraft.title || recovery.draft.theoryTitle || "제목 없는 초안"} · {timestamp(recovery.savedAt)}</span>
                <button type="button" className={button} onClick={() => recover(recovery.draft)}>이 초안 가져오기</button>
                <button type="button" className={button} onClick={() => download(exportDraft(recovery.draft))}>백업 내보내기</button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {!hosted && <p className="text-xs text-[#645c50]">웹사이트로 옮길 때 이 기기에서 초안을 내보낸 뒤, 로그인한 사이트에서 가져오세요.</p>}
      {store.conflict && (
        <section role="alert" className="space-y-3 rounded-xl border border-amber-600/40 bg-amber-50 p-4 text-[#41341f]">
          <h2 className="font-bold">두 초안 중 이어서 작성할 내용을 선택하세요</h2>
          <p>이 기기의 편집본과 서버의 편집본을 확인한 뒤 저장할 내용을 선택하세요. 필요한 내용은 내보내기로 보관할 수 있습니다.</p>
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <div className="min-w-0"><h3 className="font-semibold">이 기기의 초안</h3>
              <pre aria-label="이 기기의 초안" className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3">{preview(store.draft)}</pre>
            </div>
            <div className="min-w-0"><h3 className="font-semibold">서버의 초안</h3>
              <pre aria-label="서버의 초안" className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3">{preview(store.conflict.remote.draft)}</pre>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={() => { void store.resolveConflict("local"); }}>이 기기 초안으로 저장</button>
            <button type="button" className={button} onClick={() => { void store.resolveConflict("remote"); }}>서버 초안 불러오기</button>
            {store.conflict.remote.draft && <button type="button" className={button} onClick={() => download(exportDraft(store.conflict!.remote.draft!))}>서버 초안 내보내기</button>}
          </div>
        </section>
      )}
    </section>
  );
}
