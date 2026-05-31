"use client";

import { useState } from "react";
import { createNoteTemplate, createTheoryTemplate } from "@/lib/content/templates";
import type { ContentNode, SaveMode } from "@/lib/content/types";
import { AiPanel } from "./AiPanel";
import { FileEditor } from "./FileEditor";
import { FolderTree } from "./FolderTree";
import { SaveControls } from "./SaveControls";
import { TheoryLookupPanel } from "./TheoryLookupPanel";

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
  const [selectedPath, setSelectedPath] = useState("cs");
  const [markdown, setMarkdown] = useState(() =>
    createNoteTemplate({
      title: "@Transactional 롤백 기준을 공부하면서 헷갈린 점",
      source: "인프런 김영한 스프링 DB 1편",
      parentHref: "../README.md",
    }),
  );
  const [query, setQuery] = useState("transactional rollbackFor checked exception");
  const [mode, setMode] = useState<SaveMode>("quick");
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("초안 작성 중");

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
    setMarkdown(
      createTheoryTemplate({
        title: "트랜잭션",
        parentHref: "../README.md",
        relatedNotes: ["cs/spring/notes/inflearn-spring-db/transactional-rollback.md"],
      }),
    );
    setMode("review");
    setStatus("새 theory 초안을 만들었습니다");
  }

  async function save() {
    setStatus("GitHub 저장 요청 중");
    await fetch("/api/github/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode,
        message: "Add TIL note from til-studio",
        changes: [
          {
            path: "cs/spring/notes/inflearn-spring-db/transactional-rollback.md",
            content: markdown,
          },
        ],
      }),
    });
    setStatus("GitHub 저장 요청 완료");
  }

  return (
    <main className="grid min-h-screen grid-cols-1 gap-4 bg-zinc-50 p-4 text-zinc-950 lg:grid-cols-[260px_1fr_280px]">
      <aside className="rounded border border-zinc-200 bg-white p-4">
        <FolderTree tree={initialTree} selectedPath={selectedPath} onSelectPath={setSelectedPath} />
      </aside>
      <section className="space-y-3">
        <div className="rounded border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
          <span className="font-medium text-zinc-950">선택 위치:</span> {selectedPath}
          <span className="ml-4 font-medium text-zinc-950">상태:</span> {status}
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
        <SaveControls mode={mode} onModeChange={setMode} onSave={save} />
      </aside>
    </main>
  );
}
