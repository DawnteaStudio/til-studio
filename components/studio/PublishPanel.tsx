"use client";

import { useEffect, useRef, useState } from "react";
import type { SourceMetadata } from "@/lib/content/source-readme";
import type { SaveMode } from "@/lib/content/types";
import { encodeMarkdownPath } from "@/lib/content/markdown-path";
import type { SaveResult } from "@/lib/github/types";
import { SaveControls } from "./SaveControls";

interface Preview {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  sha: string | null;
  content: string | null;
}

interface PublishProps {
  path: string;
  content: string;
  mode: SaveMode;
  showQuick: boolean;
  sourceMetadata?: SourceMetadata;
  validationError?: string | null;
  onModeChange(mode: SaveMode): void;
  onSourceConflict?(name: string | null, paths: string[]): void;
  onPublishedQuick?(path: string): void;
}

function ChangeComparison({ before, after }: { before: string; after: string }) {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  const limit = Math.min(oldLines.length, newLines.length);
  let start = 0;
  let end = 0;
  while (start < limit && oldLines[start] === newLines[start]) start++;
  while (end < limit - start && oldLines[oldLines.length - end - 1] === newLines[newLines.length - end - 1]) end++;

  function section(title: string, lines: string[]) {
    const changed = lines.slice(start, lines.length - end);
    return (
      <div className="min-w-0 rounded-xl border border-[#204a78]/15 bg-white/70 p-3">
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">{changed.length ? changed.map((line) => line || "↵").join("\n") : "해당 줄 없음"}</pre>
      </div>
    );
  }
  return (
    <section aria-label="변경 내용" className="space-y-2">
      <p className="text-xs text-[#62594d]">변경 구간 · {start + 1}번째 줄부터</p>
      <div className="grid gap-2 md:grid-cols-2">{section("기존 내용", oldLines)}{section("저장할 내용", newLines)}</div>
    </section>
  );
}

export function PublishPanel({ path, content, mode, showQuick, sourceMetadata, validationError, onModeChange, onSourceConflict, onPublishedQuick }: PublishProps) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [readError, setReadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [confirmation, setConfirmation] = useState<{ preview: Preview; content: string; mode: SaveMode } | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ path: string; content: string; result: SaveResult } | null>(null);
  const target = preview?.path === path ? preview : null;
  const exists = target !== null && target.sha !== null;
  const unchanged = exists && target.content === content;
  const confirmed = target !== null && confirmation?.preview === target && confirmation.content === content && confirmation.mode === mode;
  const saved = receipt?.path === path && receipt.content === content ? receipt.result : null;

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/github/save?path=" + encodeURIComponent(path), { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("preview");
        const result: Preview = await response.json();
        if (result.path !== path || !result.owner || !result.repo || !result.branch ||
            !(result.sha === null && result.content === null || typeof result.sha === "string" && typeof result.content === "string")) {
          throw new Error("preview");
        }
        if (!controller.signal.aborted) { setPreview(result); setReadError(""); }
      } catch {
        if (!controller.signal.aborted) setReadError("GitHub의 현재 파일을 확인하지 못했습니다.");
      }
    }
    void load();
    return () => controller.abort();
  }, [path, attempt]);

  function reload() {
    setPreview(null);
    setReadError("");
    setConfirmation(null);
    setAttempt((current) => current + 1);
  }

  async function publish() {
    if (!target || validationError || !content.trim() || unchanged || saved || submitting.current || (exists && !confirmed)) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const { owner, repo, branch, sha } = target;
      const response = await fetch("/api/github/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expected: { owner, repo, branch, path, sha }, mode,
          message: (exists ? "Update" : "Add") + " TIL article from til-studio",
          sourceMetadata, changes: [{ path, content }],
        }),
      });
      if (response.status === 409) {
        const conflict = await response.json().catch(() => null);
        if (conflict?.error === "source_exists" && onSourceConflict) {
          onSourceConflict(conflict.sourceName, conflict.sourcePaths);
          setError("기존 학습 자료를 확인한 뒤 다시 저장하세요.");
          reload();
          return;
        }
        setError("저장소가 변경되었습니다. 최신 내용과 다시 비교하세요.");
        reload();
        return;
      }
      if (response.status === 422) {
        const result = await response.json();
        setError(result.error ?? "README의 관리 마커를 확인하세요.");
        return;
      }
      if (!response.ok) throw new Error("save");
      const result: SaveResult = await response.json();
      if (result.mode !== mode || (mode === "review" && !result.pullRequestUrl)) throw new Error("receipt");
      if (result.mode === "quick") onPublishedQuick?.(path);
      setReceipt({ path, content, result });
      reload();
    } catch {
      setError("GitHub 저장 요청이 실패했습니다. 설정과 권한을 확인하세요.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section aria-label="발행" className="studio-paper min-w-0 space-y-5 rounded-[2rem] p-5 text-[#24221d] md:p-7">
      <div>
        <h2 className="text-xl font-semibold">GitHub에 저장</h2>
        <p className="mt-2 break-all font-mono text-sm">{path || "저장 위치를 선택하세요."}</p>
        {target && <p className="mt-2 text-sm">{exists ? "기존 글 수정" : "새 글 추가"} · {target.owner}/{target.repo} · {target.branch}</p>}
      </div>
      {validationError && <p role="alert">{validationError}</p>}
      {path && !target && !readError && <p role="status">저장할 파일을 확인하는 중…</p>}
      {readError && <p role="alert">{readError} <button type="button" className="underline" onClick={reload}>다시 확인</button></p>}
      {exists && !unchanged && target.content !== null && <>
        <ChangeComparison before={target.content} after={content} />
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmation(event.target.checked ? { preview: target, content, mode } : null)} />
          변경 내용을 확인했습니다
        </label>
      </>}
      {unchanged && !saved && <p>현재 GitHub 파일과 내용이 같습니다.</p>}
      <SaveControls mode={mode} branch={target?.branch} showQuick={showQuick} onModeChange={onModeChange}
        onSave={publish} disabled={!target || Boolean(validationError) || !content.trim() || unchanged || Boolean(saved) || (exists && !confirmed)} busy={busy} />
      {busy && <p role="status" aria-label="GitHub 저장 중">GitHub에 저장하는 중입니다.</p>}
      {error && <p role="status" aria-label="GitHub 저장 실패" className="text-sm text-[#932d28]">{error}</p>}
      {saved && <div role="status" aria-label="GitHub 저장 완료" className="rounded-xl bg-[#dce8df] p-3 text-sm">
        <p>{saved.mode === "review" ? "검토용 초안 PR을 만들었습니다." : "GitHub에 저장했습니다."}</p>
        {saved.mode === "review"
          ? <a href={saved.pullRequestUrl} target="_blank" rel="noreferrer" className="font-semibold underline">초안 PR 열기</a>
          : <a href={"/docs/" + encodeMarkdownPath(path)} className="font-semibold underline">저장한 글 열기</a>}
      </div>}
    </section>
  );
}
