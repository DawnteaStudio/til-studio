"use client";

import { useEffect, useMemo, useState } from "react";
import { buildNotePath, buildTheoryPath, parentReadmePath } from "@/lib/content/paths";
import { deriveStudyTarget } from "@/lib/content/studio-target";
import { createNoteTemplate, createTheoryTemplate } from "@/lib/content/templates";
import type { ContentNode, SaveMode } from "@/lib/content/types";
import { treeFromPaths } from "@/lib/content/indexer";
import { AiPanel } from "./AiPanel";
import { FileEditor } from "./FileEditor";
import { FolderTree } from "./FolderTree";
import { SaveControls } from "./SaveControls";
import { TheoryLookupPanel } from "./TheoryLookupPanel";

type DraftKind = "note" | "theory";

const initialTree: ContentNode = {
  name: "TIL",
  path: "",
  type: "directory",
  kind: "other",
  children: [
    { name: "cs", path: "cs", type: "directory", kind: "other", children: [] },
    { name: "languages", path: "languages", type: "directory", kind: "other", children: [] },
    { name: "projects", path: "projects", type: "directory", kind: "other", children: [] },
    { name: "coding-test", path: "coding-test", type: "directory", kind: "other", children: [] },
  ],
};

export function StudioWorkspace() {
  const [tree, setTree] = useState(initialTree);
  const [selectedPath, setSelectedPath] = useState("cs");
  const [noteTitle, setNoteTitle] = useState("@Transactional 롤백 기준을 공부하면서 헷갈린 점");
  const [sourceName, setSourceName] = useState("inflearn-spring-db");
  const [theoryTitle, setTheoryTitle] = useState("트랜잭션");
  const [markdown, setMarkdown] = useState(() =>
    createNoteTemplate({
      title: "@Transactional 롤백 기준을 공부하면서 헷갈린 점",
      source: "인프런 김영한 스프링 DB 1편",
      parentHref: "../README.md",
    }),
  );
  const [query, setQuery] = useState("transactional rollbackFor checked exception");
  const [mode, setMode] = useState<SaveMode>("quick");
  const [draftKind, setDraftKind] = useState<DraftKind>("note");
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("초안 작성 중");
  const target = useMemo(() => deriveStudyTarget(selectedPath), [selectedPath]);
  const notePath = useMemo(() => {
    if (!target) return "";
    return buildNotePath({
      ...target,
      source: sourceName,
      title: noteTitle,
    });
  }, [noteTitle, sourceName, target]);
  const theoryPath = useMemo(() => {
    if (!target) return "";
    return buildTheoryPath({
      ...target,
      title: theoryTitle,
    });
  }, [target, theoryTitle]);

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
        setStatus("샘플 트리로 시작합니다");
      }
    }

    loadTree();

    return () => {
      isMounted = false;
    };
  }, []);

  function regenerateNoteTemplate() {
    if (!notePath) {
      setStatus("cs/languages/projects 아래의 주제 폴더를 선택하세요");
      return;
    }

    setMarkdown(
      createNoteTemplate({
        title: noteTitle,
        source: sourceName,
        parentHref: parentReadmePath(notePath),
      }),
    );
    setMode("quick");
    setDraftKind("note");
    setStatus(`note 초안 생성: ${notePath}`);
  }

  async function cleanup() {
    setIsBusy(true);
    setStatus("AI가 notes 형식으로 다듬는 중");
    try {
      const response = await fetch("/api/ai/note-cleanup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = (await response.json()) as { markdown?: string };
      if (data.markdown) setMarkdown(data.markdown);
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
        body: JSON.stringify({ markdown }),
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
      setStatus("theory를 만들 주제 폴더를 먼저 선택하세요");
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
            content: markdown,
          },
        ],
      }),
    });
    setStatus(`GitHub 저장 요청 완료: ${path}`);
  }

  return (
    <main className="grid min-h-screen grid-cols-1 gap-4 bg-zinc-50 p-4 text-zinc-950 lg:grid-cols-[260px_1fr_280px]">
      <aside className="rounded border border-zinc-200 bg-white p-4">
        <FolderTree tree={tree} selectedPath={selectedPath} onSelectPath={setSelectedPath} />
      </aside>
      <section className="space-y-3">
        <div className="space-y-3 rounded border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
          <div>
            <span className="font-medium text-zinc-950">선택 위치:</span> {selectedPath}
            <span className="ml-4 font-medium text-zinc-950">상태:</span> {status}
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1">
              <span className="block text-xs font-medium text-zinc-700">학습 자료 폴더</span>
              <input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-950"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-medium text-zinc-700">note 제목</span>
              <input
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-950"
              />
            </label>
            <button
              type="button"
              onClick={regenerateNoteTemplate}
              className="self-end rounded bg-zinc-950 px-3 py-2 text-sm text-white"
            >
              note 초안 생성
            </button>
          </div>
          <div className="rounded bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700">
            {notePath || "주제 폴더를 선택하면 저장 경로가 표시됩니다"}
          </div>
        </div>
        <FileEditor value={markdown} onChange={setMarkdown} />
      </section>
      <aside className="space-y-5 rounded border border-zinc-200 bg-white p-4">
        <AiPanel onCleanup={cleanup} onFindMissing={findMissing} isBusy={isBusy} />
        <TheoryLookupPanel
          query={query}
          onQueryChange={setQuery}
          onSearch={() => setStatus(`theory 조회: ${query}`)}
          onCreateTheory={createTheory}
        />
        <label className="block space-y-1 text-sm">
          <span className="font-semibold text-zinc-950">Theory Title</span>
          <input
            value={theoryTitle}
            onChange={(event) => setTheoryTitle(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-950"
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
