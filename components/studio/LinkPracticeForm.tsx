"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { articleHref } from "@/lib/content/archive";
import { sourcePracticeSlugs } from "@/lib/content/paths";
import { isValidPracticeName, linkExistingPractice, readPracticeLinks } from "@/lib/content/practice-links";
import { linkedPracticeSlugs } from "@/lib/content/source-readme";
import type { SaveMode } from "@/lib/content/types";
import type { SaveResult } from "@/lib/github/types";
import { SaveControls } from "./SaveControls";

interface Props {
  owner: string;
  repo: string;
  branch: string;
  topic: string;
  source: string;
  notes: { path: string; title: string }[];
  practices: string[];
  initialPractice: string;
}

type RemoteNote = { path: string; owner: string; repo: string; branch: string; sha: string; content: string };
type Receipt = SaveResult & { alreadyLinked?: boolean };

function previewLinks(remote: RemoteNote, available: string[], practice: string) {
  const noteSlug = remote.path.split("/").at(-1)!.replace(/\.md$/i, "");
  const existingFolders = new Set(available);
  function summarize(markdown: string) {
    const explicit = readPracticeLinks(markdown);
    return {
      connected: linkedPracticeSlugs(noteSlug, explicit, existingFolders),
      pending: explicit.filter((name) => !existingFolders.has(name)),
    };
  }
  try {
    const next = linkExistingPractice(remote.content, noteSlug, available, practice);
    return { current: summarize(remote.content), next: summarize(next), linked: next === remote.content, error: "" };
  } catch (reason) {
    return { current: null, next: null, linked: false,
      error: reason instanceof Error ? reason.message : "이 노트의 코드 링크를 확인하지 못했습니다." };
  }
}

export function LinkPracticeForm({ owner, repo, branch, source, topic, notes, practices, initialPractice }: Props) {
  const router = useRouter();
  const [path, setPath] = useState("");
  const [practice, setPractice] = useState(initialPractice);
  const [available, setAvailable] = useState(practices);
  const [mode, setMode] = useState<SaveMode>("quick");
  const [remote, setRemote] = useState<RemoteNote | null>(null);
  const [readError, setReadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [reads, setReads] = useState(0);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const submitting = useRef(false);
  const target = remote?.path === path ? remote : null;
  const missingPractice = Boolean(practice && !available.includes(practice));
  const preview = target && practice && !missingPractice ? previewLinks(target, available, practice) : null;
  const canSave = Boolean(target && preview && !preview.error && !preview.linked && !receipt);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    async function read() {
      try {
        const response = await fetch(`/api/github/save?${new URLSearchParams({ path })}`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("GitHub에서 노트를 불러오지 못했습니다.");
        const file = await response.json();
        if (file.owner !== owner || file.repo !== repo || file.branch !== branch || file.path !== path) {
          throw new Error("저장소 또는 브랜치가 변경되었습니다. 페이지를 새로고침해 노트를 다시 선택하세요.");
        }
        if (typeof file.sha !== "string" || !file.sha || typeof file.content !== "string") {
          throw new Error("선택한 노트를 GitHub에서 찾을 수 없습니다.");
        }
        if (reads > 0) {
          const treeResponse = await fetch("/api/github/tree", { cache: "no-store", signal: controller.signal });
          if (!treeResponse.ok) throw new Error("GitHub의 코드 폴더 목록을 확인하지 못했습니다.");
          const tree = await treeResponse.json();
          if (tree.owner !== owner || tree.repo !== repo || tree.branch !== branch || !Array.isArray(tree.allPaths)) {
            throw new Error("저장소 정보가 변경되었습니다. 페이지를 새로고침하세요.");
          }
          if (!controller.signal.aborted) {
            setAvailable(sourcePracticeSlugs(tree.allPaths, `${topic}/notes/${source}`).filter(isValidPracticeName));
          }
        }
        if (!controller.signal.aborted) setRemote(file);
      } catch (reason) {
        if (!controller.signal.aborted) setReadError(reason instanceof Error ? reason.message : "노트를 불러오지 못했습니다.");
      }
    }
    void read();
    return () => controller.abort();
  }, [path, reads, owner, repo, branch, topic, source]);

  function retry() {
    setRemote(null);
    setReadError("");
    setSaveError("");
    setReads((count) => count + 1);
  }

  async function save() {
    if (!target || !canSave || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setSaveError("");
    try {
      const expected = { owner, repo, branch, path, sha: target.sha };
      const response = await fetch("/api/github/practice-link", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, path, practice, expected }),
      });
      const result = await response.json();
      if (response.status === 409) {
        setRemote(null);
        setReadError(result.error || "저장소가 변경되었습니다. 최신 노트를 다시 확인하세요.");
        return;
      }
      if (!response.ok) throw new Error(result.error || "GitHub에 코드 링크를 저장하지 못했습니다.");
      if (result.mode !== mode || (!result.alreadyLinked && mode === "review" && !result.pullRequestUrl)) {
        throw new Error("GitHub 저장 결과를 확인하지 못했습니다.");
      }
      setReceipt(result);
      if (result.mode === "quick" || result.alreadyLinked) router.refresh();
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "GitHub에 코드 링크를 저장하지 못했습니다.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const selectClass = "mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-[#baafa0] bg-white px-3 text-sm font-medium";
  return (
    <div className="min-w-0 space-y-5">
      <p className="break-all text-sm text-[#605a50]">{owner}/{repo} · {topic} · {source}</p>
      <fieldset disabled={busy} className="grid min-w-0 gap-4">
        <legend className="sr-only">코드 폴더와 노트 선택</legend>
        <label className="min-w-0 text-sm font-bold">GitHub에 올린 코드 폴더
          <select className={selectClass} value={missingPractice ? "" : practice} onChange={(event) => {
            setPractice(event.target.value);
            if (receipt) retry();
            setReceipt(null);
            setSaveError("");
          }}>
            <option value="">코드 폴더 선택</option>
            {available.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-sm font-bold">링크를 추가할 노트
          <select className={selectClass} value={path} aria-describedby={path ? "selected-note-path" : undefined} onChange={(event) => {
            setPath(event.target.value); setRemote(null); setReadError(""); setSaveError(""); setReceipt(null);
          }}>
            <option value="">노트 선택</option>
            {notes.map((note) => <option key={note.path} value={note.path}>{note.title} · {note.path.split("/").at(-1)}</option>)}
          </select>
        </label>
        {path && <p id="selected-note-path" className="break-all font-mono text-xs text-[#605a50]">{path}</p>}
      </fieldset>
      {missingPractice && <p role="alert" className="text-sm text-[#812d24]">선택한 코드 폴더를 GitHub에서 찾을 수 없습니다. 다른 코드 폴더를 선택하세요.</p>}
      {path && !target && !readError && <p role="status" className="text-sm">GitHub에서 최신 노트를 불러오는 중…</p>}
      {readError && <div role="alert" className="space-y-2 text-sm text-[#812d24]"><p>{readError}</p>
        <button type="button" className="min-h-11 underline" onClick={retry}>최신 노트 다시 확인</button>
      </div>}
      {preview?.current && preview.next && !receipt && <section aria-label="노트의 코드 링크" className="space-y-2 rounded-xl bg-white/55 p-4 text-sm">
        <h2 className="font-bold">노트의 코드 링크</h2>
        <p className="break-all">현재 코드 링크 · {preview.current.connected.join(", ") || "없음"}</p>
        {preview.current.pending.length > 0 && <p className="break-all">현재 코드 대기 · {preview.current.pending.join(", ")}</p>}
        {!preview.linked && <>
          <p className="break-all">저장 후 코드 링크 · {preview.next.connected.join(", ")}</p>
          {preview.next.pending.length > 0 && <p className="break-all">저장 후 코드 대기 · {preview.next.pending.join(", ")}</p>}
        </>}
        <details><summary className="cursor-pointer py-2 underline">GitHub 원문 확인</summary>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all">{target?.content}</pre>
        </details>
      </section>}
      {preview?.error && <p role="alert" className="text-sm text-[#812d24]">{preview.error}</p>}
      {!receipt && !preview?.linked &&
        <SaveControls mode={mode} branch={branch} onModeChange={setMode} onSave={save} disabled={!canSave} busy={busy} />}
      {saveError && <p role="alert" className="text-sm text-[#812d24]">{saveError}</p>}
      {(receipt || preview?.linked) && <div role="status" className="space-y-2 rounded-xl bg-[#dce8df] p-4 text-sm">
        <p>{receipt?.alreadyLinked || preview?.linked ? "이 노트에 코드 폴더 링크가 이미 있습니다."
          : receipt?.mode === "review" ? "검토용 초안 PR을 만들었습니다." : "노트에 코드 폴더 링크를 추가했습니다."}</p>
        {receipt?.mode === "review" && !receipt.alreadyLinked
          ? <a className="inline-block py-1 font-bold underline" href={receipt.pullRequestUrl}>초안 PR 열기</a>
          : <div className="flex flex-wrap gap-x-4">
            <a className="inline-flex min-h-11 items-center font-bold underline" href={articleHref(path)}>연결된 노트 열기</a>
            <a className="inline-flex min-h-11 items-center font-bold underline" href="/map">갱신된 학습 지도 열기</a>
          </div>}
      </div>}
    </div>
  );
}
