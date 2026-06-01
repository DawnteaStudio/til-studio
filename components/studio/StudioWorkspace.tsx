"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { treeFromPaths } from "@/lib/content/indexer";
import { draftToNoteMarkdown, type StructuredNoteDraft } from "@/lib/content/note-draft";
import { buildNotePath, buildTheoryPath, parentReadmePath } from "@/lib/content/paths";
import { deriveStudyTarget } from "@/lib/content/studio-target";
import { defaultSaveModeForDraft, type StudioDraftKind } from "@/lib/content/studio-workspace";
import { createTheoryTemplate } from "@/lib/content/templates";
import type { ContentNode, SaveMode } from "@/lib/content/types";
import {
  folderVisibilityCookieName,
  folderVisibilityStorageKey,
  topLevelFolder,
} from "@/lib/content/visibility";
import { AiPanel } from "./AiPanel";
import { FileEditor } from "./FileEditor";
import { FolderTree } from "./FolderTree";
import { NoteComposer } from "./NoteComposer";
import { SaveControls } from "./SaveControls";
import { TheoryLookupPanel } from "./TheoryLookupPanel";

const initialTree: ContentNode = {
  name: "TIL",
  path: "",
  type: "directory",
  kind: "other",
  children: [],
};

function readVisibleRootPaths(): string[] {
  try {
    const raw = window.localStorage.getItem(folderVisibilityStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function persistVisibleRootPaths(paths: string[]) {
  window.localStorage.setItem(folderVisibilityStorageKey, JSON.stringify(paths));
  document.cookie = `${folderVisibilityCookieName}=${encodeURIComponent(
    JSON.stringify(paths),
  )}; path=/; max-age=31536000; SameSite=Lax`;
}

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
  const [draftKind, setDraftKind] = useState<StudioDraftKind>("note");
  const [isBusy, setIsBusy] = useState(false);
  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [visibleRootPaths, setVisibleRootPaths] = useState<string[]>([]);
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

  function updateDraftKind(kind: StudioDraftKind) {
    setDraftKind(kind);
    setMode(defaultSaveModeForDraft(kind));
    if (kind === "note") {
      setIsMarkdownEditing(false);
    } else {
      setIsMarkdownEditing(true);
      if (!markdown && theoryTitle) {
        setMarkdown(
          createTheoryTemplate({
            title: theoryTitle,
            parentHref: theoryPath ? parentReadmePath(theoryPath) : "../README.md",
            relatedNotes: notePath ? [notePath] : [],
          }),
        );
      }
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadTree() {
      setIsTreeLoading(true);
      try {
        const response = await fetch("/api/github/tree");
        if (!response.ok) return;
        const data = (await response.json()) as { paths?: string[] };
        if (isMounted && data.paths?.length) {
          const roots = [...new Set(data.paths.map(topLevelFolder).filter(Boolean))].sort();
          const saved = readVisibleRootPaths();
          setTree(treeFromPaths(data.paths));
          const visibleRoots = saved.length ? roots.filter((root) => saved.includes(root)) : roots;
          setVisibleRootPaths(visibleRoots);
          persistVisibleRootPaths(visibleRoots);
          setStatus("TIL 레포 구조를 불러왔습니다");
        }
      } catch {
        setStatus("TIL 레포 구조를 불러오지 못했습니다");
      } finally {
        if (isMounted) setIsTreeLoading(false);
      }
    }

    loadTree();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateVisibleRootPaths(paths: string[]) {
    setVisibleRootPaths(paths);
    persistVisibleRootPaths(paths);
    if (selectedPath && !paths.includes(topLevelFolder(selectedPath))) {
      setSelectedPath("");
    }
  }

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
    if (!theoryPath) {
      setStatus("위치와 theory 제목을 먼저 입력하세요");
      return;
    }

    setMarkdown(
      createTheoryTemplate({
        title: theoryTitle,
        parentHref: parentReadmePath(theoryPath),
        relatedNotes: notePath ? [notePath] : [],
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
    <main className="grid min-h-screen grid-cols-1 bg-[#151611] text-[#f4efe4] lg:grid-cols-[300px_minmax(0,1fr)_340px]">
      <aside className="border-b border-[#2a2d22] bg-[#1d2118] p-5 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="text-lg font-semibold text-[#f3ecd8]">
            til-studio
          </Link>
          <Link
            href="/blog"
            className="rounded-full bg-[#2a2f22] px-3 py-1.5 text-xs font-medium text-[#d8d0bd] hover:bg-[#343b2a]"
          >
            Blog
          </Link>
        </div>
        <FolderTree
          tree={tree}
          selectedPath={selectedPath}
          draftKind={draftKind}
          sourceName={sourceName}
          visibleRootPaths={visibleRootPaths}
          onDraftKindChange={updateDraftKind}
          onSourceNameChange={setSourceName}
          onVisibleRootPathsChange={updateVisibleRootPaths}
          onSelectPath={setSelectedPath}
          isLoading={isTreeLoading}
        />
      </aside>
      <section className="min-w-0 bg-[#e8dfd0] px-5 py-6 text-[#201f1b] md:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
        <div className="pb-7 text-sm text-[#6b6257]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#837969]">
                Writing Session
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-[#24221d]">
                새 학습 기록 작성
              </h1>
            </div>
            <div className="max-w-full rounded-full bg-[#27251f] px-4 py-2 text-xs font-medium text-[#efe7d8]">
              {status}
            </div>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-[1fr_auto]">
            <label className="space-y-1">
              <span className="block text-xs font-semibold text-[#5e564c]">작업 위치</span>
              <div className="flex h-12 items-center rounded-2xl bg-[#d8cebd] px-4 text-sm text-[#39352d] shadow-inner">
                {selectedPath || "왼쪽에서 area와 topic을 선택하세요"}
              </div>
            </label>
            <button
              type="button"
              onClick={draftKind === "theory" ? createTheory : prepareNotePublish}
              className="self-end rounded-2xl bg-[#31513a] px-5 py-3 text-sm font-semibold text-[#f6efe2] shadow-[0_14px_30px_rgba(38,57,40,0.25)] transition hover:bg-[#294632]"
            >
              {draftKind === "theory" ? "Theory 초안 만들기" : "Publish 준비"}
            </button>
          </div>
          <div className="mt-4 rounded-2xl bg-[#2b2923] px-4 py-3 font-mono text-xs text-[#e8dcc7]">
            {(draftKind === "theory" ? theoryPath : notePath) || "선택을 마치면 저장 경로가 표시됩니다"}
          </div>
          <p className="mt-2 text-xs leading-5 text-[#6b6257]">
            {draftKind === "theory"
              ? "Theory는 선택한 topic 아래 theory 폴더로 자동 저장됩니다."
              : "Notes는 선택한 topic과 source 아래 notes 폴더로 자동 저장됩니다."}
          </p>
        </div>
        {draftKind === "note" ? (
          <NoteComposer draft={noteDraft} onChange={updateNoteDraft} />
        ) : null}
        <section className="mt-8 border-t border-[#c8bba7] pt-7">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#24221d]">Markdown Preview</h2>
              <p className="mt-1 text-sm text-[#6b6257]">
                Publish 시점에는 이 내용이 GitHub에 저장됩니다.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-full bg-[#d8cebd] px-4 py-2 text-sm font-medium text-[#3a352e]">
              <input
                type="checkbox"
                checked={isMarkdownEditing}
                onChange={(event) => {
                  if (event.target.checked) setMarkdown(publishMarkdown);
                  setIsMarkdownEditing(event.target.checked);
                }}
                className="size-4 rounded border-[#968b78]"
              />
              Markdown 원문 수정
            </label>
          </div>
          {isMarkdownEditing ? (
            <FileEditor value={markdown} onChange={setMarkdown} />
          ) : (
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-3xl bg-[#d9d0c0] p-5 font-mono text-sm leading-7 text-[#343027] shadow-inner">
              {publishMarkdown}
            </pre>
          )}
        </section>
        </div>
      </section>
      <aside className="bg-[#24281e] p-5 text-[#f4efe4] lg:min-h-screen lg:border-l lg:border-[#34382b]">
        <div className="sticky top-5 space-y-5">
        <AiPanel onCleanup={cleanup} onFindMissing={findMissing} isBusy={isBusy} />
        <TheoryLookupPanel
          query={query}
          onQueryChange={setQuery}
          onSearch={() => setStatus(`theory 조회: ${query}`)}
          onCreateTheory={createTheory}
        />
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-[#f4efe4]">Theory Title</span>
          <input
            value={theoryTitle}
            onChange={(event) => setTheoryTitle(event.target.value)}
            className="h-11 w-full rounded-2xl bg-[#34382b] px-4 text-sm text-[#f4efe4] outline-none placeholder:text-[#918a79] focus:ring-4 focus:ring-[#769269]/30"
          />
          <span className="block break-all font-mono text-xs text-[#a9a18f]">
            {theoryPath || "주제 폴더를 선택하세요"}
          </span>
        </label>
        <SaveControls mode={mode} onModeChange={setMode} onSave={save} />
        </div>
      </aside>
    </main>
  );
}
