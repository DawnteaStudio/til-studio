"use client";

import { useEffect, useMemo, useState } from "react";
import { treeFromPaths } from "@/lib/content/indexer";
import { draftToNoteMarkdown, type StructuredNoteDraft } from "@/lib/content/note-draft";
import { buildNotePath, buildTheoryPath, parentReadmePath } from "@/lib/content/paths";
import { deriveStudyTarget } from "@/lib/content/studio-target";
import { createTheoryTemplate } from "@/lib/content/templates";
import type { ContentNode, SaveMode } from "@/lib/content/types";
import { AiPanel } from "./AiPanel";
import { FileEditor } from "./FileEditor";
import { FolderTree } from "./FolderTree";
import { NoteComposer } from "./NoteComposer";
import { SaveControls } from "./SaveControls";
import { TheoryLookupPanel } from "./TheoryLookupPanel";

type DraftKind = "note" | "theory";

const initialTree: ContentNode = {
  name: "TIL",
  path: "",
  type: "directory",
  kind: "other",
  children: [],
};

export function StudioWorkspace() {
  const [tree, setTree] = useState(initialTree);
  const [selectedPath, setSelectedPath] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [theoryTitle, setTheoryTitle] = useState("");
  const [noteDraft, setNoteDraft] = useState<StructuredNoteDraft>({
    title: "",
    source: "",
    learned: "",
    confused: "",
    questions: "",
    conclusion: "",
    experiments: "",
    parentHref: "../README.md",
  });
  const [markdown, setMarkdown] = useState("");
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SaveMode>("quick");
  const [draftKind, setDraftKind] = useState<DraftKind>("note");
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("TIL 레포 구조를 불러오는 중");
  const target = useMemo(() => deriveStudyTarget(selectedPath), [selectedPath]);
  const notePath = useMemo(() => {
    if (!target) return "";
    if (!sourceName.trim() || !noteDraft.title.trim()) return "";
    return buildNotePath({
      ...target,
      source: sourceName,
      title: noteDraft.title,
    });
  }, [noteDraft.title, sourceName, target]);
  const theoryPath = useMemo(() => {
    if (!target) return "";
    if (!theoryTitle.trim()) return "";
    return buildTheoryPath({
      ...target,
      title: theoryTitle,
    });
  }, [target, theoryTitle]);
  const generatedNoteMarkdown = useMemo(
    () =>
      draftToNoteMarkdown({
        ...noteDraft,
        parentHref: notePath ? parentReadmePath(notePath) : "../README.md",
      }),
    [noteDraft, notePath],
  );
  const publishMarkdown = draftKind === "note" && !isMarkdownEditing ? generatedNoteMarkdown : markdown;

  useEffect(() => {
    let isMounted = true;

    async function loadTree() {
      try {
        const response = await fetch("/api/github/tree");
        if (!response.ok) return;
        const data = (await response.json()) as { paths?: string[] };
        if (isMounted && data.paths?.length) {
          setTree(treeFromPaths(data.paths));
          setStatus("TIL 레포 구조를 불러왔습니다");
        }
      } catch {
        setStatus("TIL 레포 구조를 불러오지 못했습니다");
      }
    }

    loadTree();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateNoteDraft(field: Exclude<keyof StructuredNoteDraft, "parentHref">, value: string) {
    setNoteDraft((current) => ({ ...current, [field]: value }));
    setDraftKind("note");
  }

  function prepareNotePublish() {
    if (!notePath) {
      setStatus("위치, 학습 자료 폴더, 제목을 먼저 입력하세요");
      return;
    }

    setMarkdown(generatedNoteMarkdown);
    setMode("quick");
    setDraftKind("note");
    setIsMarkdownEditing(false);
    setStatus(`publish 준비: ${notePath}`);
  }

  async function cleanup() {
    setIsBusy(true);
    setStatus("AI가 notes 형식으로 다듬는 중");
    try {
      const response = await fetch("/api/ai/note-cleanup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown: publishMarkdown }),
      });
      const data = (await response.json()) as { markdown?: string };
      if (data.markdown) {
        setMarkdown(data.markdown);
        setIsMarkdownEditing(true);
      }
      setStatus("AI 정리 완료");
    } catch {
      setStatus("AI 정리에 실패했습니다");
    } finally {
      setIsBusy(false);
    }
  }

  async function findMissing() {
    setIsBusy(true);
    setStatus("빠진 섹션 확인 중");
    try {
      const response = await fetch("/api/ai/missing-sections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown: publishMarkdown }),
      });
      const data = (await response.json()) as { followUpQuestions?: string[] };
      setStatus(data.followUpQuestions?.join(" / ") || "빠진 섹션이 없습니다");
    } catch {
      setStatus("빠진 섹션 확인에 실패했습니다");
    } finally {
      setIsBusy(false);
    }
  }

  function createTheory() {
    if (!theoryPath || !notePath) {
      setStatus("위치, note 제목, 학습 자료 폴더, theory 제목을 먼저 입력하세요");
      return;
    }

    setMarkdown(
      createTheoryTemplate({
        title: theoryTitle,
        parentHref: parentReadmePath(theoryPath),
        relatedNotes: [notePath],
      }),
    );
    setMode("review");
    setDraftKind("theory");
    setIsMarkdownEditing(true);
    setStatus(`새 theory 초안 생성: ${theoryPath}`);
  }

  async function save() {
    const path = draftKind === "theory" ? theoryPath : notePath;
    if (!path) {
      setStatus("저장할 경로를 만들 수 없습니다");
      return;
    }

    setStatus("GitHub 저장 요청 중");
    await fetch("/api/github/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode,
        message: "Add TIL note from til-studio",
        changes: [
          {
            path,
            content: publishMarkdown,
          },
        ],
      }),
    });
    setStatus(`GitHub 저장 요청 완료: ${path}`);
  }

  return (
    <main className="grid min-h-screen grid-cols-1 gap-5 bg-[#f7f5f1] p-5 text-zinc-950 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm shadow-zinc-200/70">
        <FolderTree tree={tree} selectedPath={selectedPath} onSelectPath={setSelectedPath} />
      </aside>
      <section className="space-y-5">
        <div className="rounded-2xl border border-zinc-200 bg-white/95 p-5 text-sm text-zinc-600 shadow-sm shadow-zinc-200/70">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Writing Session
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-zinc-950">새 학습 기록 작성</h1>
            </div>
            <div className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600">
              {status}
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1">
              <span className="block text-xs font-semibold text-zinc-700">선택 위치</span>
              <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-700">
                {selectedPath}
              </div>
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-semibold text-zinc-700">학습 자료 폴더</span>
              <input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100"
              />
            </label>
            <button
              type="button"
              onClick={prepareNotePublish}
              className="self-end rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
            >
              Publish 준비
            </button>
          </div>
          <div className="mt-3 rounded-xl bg-zinc-50 px-4 py-3 font-mono text-xs text-zinc-700">
            {notePath || "주제 폴더를 선택하면 저장 경로가 표시됩니다"}
          </div>
        </div>
        {draftKind === "note" ? (
          <NoteComposer draft={noteDraft} onChange={updateNoteDraft} />
        ) : null}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/60">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Markdown Preview</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Publish 시점에는 이 내용이 GitHub에 저장됩니다.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={isMarkdownEditing}
                onChange={(event) => {
                  if (event.target.checked) setMarkdown(publishMarkdown);
                  setIsMarkdownEditing(event.target.checked);
                }}
                className="size-4 rounded border-zinc-300"
              />
              Markdown 원문 수정
            </label>
          </div>
          {isMarkdownEditing ? (
            <FileEditor value={markdown} onChange={setMarkdown} />
          ) : (
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm leading-7 text-zinc-800">
              {publishMarkdown}
            </pre>
          )}
        </section>
      </section>
      <aside className="space-y-5">
        <AiPanel onCleanup={cleanup} onFindMissing={findMissing} isBusy={isBusy} />
        <TheoryLookupPanel
          query={query}
          onQueryChange={setQuery}
          onSearch={() => setStatus(`theory 조회: ${query}`)}
          onCreateTheory={createTheory}
        />
        <label className="block space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm shadow-zinc-200/60">
          <span className="font-semibold text-zinc-950">Theory Title</span>
          <input
            value={theoryTitle}
            onChange={(event) => setTheoryTitle(event.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100"
          />
          <span className="block break-all font-mono text-xs text-zinc-500">
            {theoryPath || "주제 폴더를 선택하세요"}
          </span>
        </label>
        <SaveControls mode={mode} onModeChange={setMode} onSave={save} />
      </aside>
    </main>
  );
}
