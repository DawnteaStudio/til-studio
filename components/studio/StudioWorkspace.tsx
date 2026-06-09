"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { treeFromPaths } from "@/lib/content/indexer";
import { draftToNoteMarkdown, type StructuredNoteDraft } from "@/lib/content/note-draft";
import { buildNotePath, buildTheoryPath, makeSlug, parentReadmePath } from "@/lib/content/paths";
import { deriveStudyTarget } from "@/lib/content/studio-target";
import {
  buildStudioWorkspace,
  defaultSaveModeForDraft,
  type StudioDraftKind,
  type StudioSourceOption,
} from "@/lib/content/studio-workspace";
import { createTheoryTemplate } from "@/lib/content/templates";
import type { ContentNode, SaveMode } from "@/lib/content/types";
import {
  folderVisibilityCookieName,
  folderVisibilityStorageKey,
  topLevelFolder,
} from "@/lib/content/visibility";
import { MarkdownArticle } from "@/components/public/MarkdownArticle";
import { FileEditor } from "./FileEditor";
import { FolderTree } from "./FolderTree";
import { NoteComposer } from "./NoteComposer";
import { SaveControls } from "./SaveControls";
import { SettingsPanel } from "./SettingsPanel";
import { TheoryResearchPanel, type TheoryResearchResult } from "./TheoryResearchPanel";

const initialTree: ContentNode = {
  name: "TIL",
  path: "",
  type: "directory",
  kind: "other",
  children: [],
};

type StudioNotice = {
  title: string;
  message: string;
  tone: "progress" | "success" | "error";
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

function SourceFolderPicker({
  selectedPath,
  sourceName,
  sources,
  onSourceNameChange,
}: {
  selectedPath: string;
  sourceName: string;
  sources: StudioSourceOption[];
  onSourceNameChange(source: string): void;
}) {
  const slug = makeSlug(sourceName);

  return (
    <section className="mt-5 rounded-3xl bg-[#d8cebd] p-4 text-[#302c24] shadow-inner">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#756b5e]">Source</p>
          <h2 className="mt-1 text-base font-semibold text-[#25221c]">저장 source 폴더</h2>
        </div>
        <p className="rounded-full bg-[#27251f] px-3 py-1.5 text-xs font-medium text-[#efe7d8]">
          {sourceName ? `선택된 source: ${sourceName}` : "source를 선택하세요"}
        </p>
      </div>

      {!selectedPath ? (
        <p className="mt-4 rounded-2xl bg-[#cfc2af] px-4 py-3 text-sm text-[#5a5045]">
          먼저 topic을 선택하면 source 폴더를 고를 수 있습니다.
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          {sources.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {sources.map((source) => (
                <button
                  key={source.path}
                  type="button"
                  onClick={() => onSourceNameChange(source.name)}
                  className={[
                    "rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                    sourceName === source.name
                      ? "bg-[#31513a] text-[#f6efe2] shadow-[0_12px_24px_rgba(49,81,58,0.22)]"
                      : "bg-[#e8dfd0] text-[#3c362d] hover:bg-[#f3ebdf]",
                  ].join(" ")}
                >
                  {source.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[#cfc2af] px-4 py-3 text-sm text-[#5a5045]">
              아직 source 폴더가 없습니다. 새 source를 만들어 시작하세요.
            </p>
          )}

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#3f3a31]">새 source 이름</span>
            <input
              value={sourceName}
              onChange={(event) => onSourceNameChange(event.target.value)}
              placeholder="예: Software Maestro, Clean Code, Inflearn Spring"
              className="h-12 rounded-2xl bg-[#f3ebdf] px-4 text-sm text-[#25221c] outline-none shadow-inner placeholder:text-[#8d8373] focus:ring-4 focus:ring-[#c7ad6d]/30"
            />
          </label>

          <div className="rounded-2xl bg-[#2b2923] px-4 py-3 font-mono text-xs text-[#e8dcc7]">
            {slug ? `저장 폴더: ${slug}` : "source 이름을 입력하면 저장 폴더가 표시됩니다"}
          </div>
        </div>
      )}
    </section>
  );
}

export function StudioWorkspace() {
  const [tree, setTree] = useState(initialTree);
  const [selectedPath, setSelectedPath] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [theoryTitle, setTheoryTitle] = useState("");
  const [noteDraft, setNoteDraft] = useState<StructuredNoteDraft>({
    title: "",
    created: "",
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
  const [theoryKeyword, setTheoryKeyword] = useState("");
  const [theoryResearch, setTheoryResearch] = useState<TheoryResearchResult | null>(null);
  const [isResearchingTheory, setIsResearchingTheory] = useState(false);
  const [mode, setMode] = useState<SaveMode>("quick");
  const [draftKind, setDraftKind] = useState<StudioDraftKind>("note");
  const [isBusy, setIsBusy] = useState(false);
  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [visibleRootPaths, setVisibleRootPaths] = useState<string[]>([]);
  const [status, setStatus] = useState("TIL 레포 구조를 불러오는 중");
  const [notice, setNotice] = useState<StudioNotice | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const workspace = useMemo(() => buildStudioWorkspace(tree, visibleRootPaths), [tree, visibleRootPaths]);
  const target = useMemo(() => deriveStudyTarget(selectedPath), [selectedPath]);
  const selectedTopicSources = useMemo<StudioSourceOption[]>(() => {
    if (!selectedPath) return [];
    return (
      workspace.areas
        .flatMap((area) => area.topics)
        .find((topic) => topic.path === selectedPath)?.sources ?? []
    );
  }, [selectedPath, workspace]);
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
  const publishMarkdown = draftKind === "note" ? markdown || generatedNoteMarkdown : markdown;

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

  useEffect(() => {
    if (!notice || notice.tone === "progress") return;

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  function updateVisibleRootPaths(paths: string[]) {
    setVisibleRootPaths(paths);
    persistVisibleRootPaths(paths);
    if (selectedPath && !paths.includes(topLevelFolder(selectedPath))) {
      setSelectedPath("");
    }
  }

  function updateNoteDraft(
    field: Exclude<keyof StructuredNoteDraft, "created" | "parentHref">,
    value: string,
  ) {
    setNoteDraft((current) => ({ ...current, [field]: value }));
    setDraftKind("note");
  }

  function missingNoteMarkdownFields() {
    const missing = [];
    if (!target) missing.push("작업 위치");
    if (!noteDraft.title.trim()) missing.push("제목");
    if (!noteDraft.learned.trim()) missing.push("오늘 배운 것");
    return missing;
  }

  async function createNoteMarkdown() {
    const missing = missingNoteMarkdownFields();
    if (missing.length) {
      setStatus(`${missing.join(", ")}을 먼저 입력하세요`);
      return;
    }

    setIsBusy(true);
    setStatus("학습 글 초안을 만드는 중");
    setNotice({
      title: "글 초안 생성 중",
      message: "AI가 메모를 학습 글로 다듬는 중입니다",
      tone: "progress",
    });
    try {
      const response = await fetch("/api/ai/note-cleanup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown: generatedNoteMarkdown }),
      });
      if (!response.ok) throw new Error("Note cleanup failed");
      const data = (await response.json()) as { markdown?: string };
      if (data.markdown) {
        setMarkdown(data.markdown);
        setIsMarkdownEditing(false);
      }
      setMode("quick");
      setDraftKind("note");
      setStatus("글 초안 생성 완료");
      setNotice({
        title: "글 초안 생성 완료",
        message: "초안이 완성되었습니다. 미리보기에서 확인하세요.",
        tone: "success",
      });
    } catch {
      setStatus("글 초안 생성에 실패했습니다");
      setNotice({
        title: "글 초안 생성 실패",
        message: "잠시 뒤 다시 시도하거나 API 설정을 확인하세요.",
        tone: "error",
      });
    } finally {
      setIsBusy(false);
    }
  }

  function createTheoryFromResearch(result: TheoryResearchResult) {
    if (!target) {
      setStatus("먼저 왼쪽에서 Theory를 저장할 area와 topic을 선택하세요");
      return;
    }

    const nextTheoryPath = buildTheoryPath({
      ...target,
      title: result.title,
    });
    setTheoryTitle(result.title);
    setMarkdown(
      createTheoryTemplate({
        title: result.title,
        parentHref: parentReadmePath(nextTheoryPath),
        concept: result.concept,
        keyPoints: result.keyPoints,
        cautions: result.cautions,
        sources: result.sources,
        relatedNotes: notePath ? [notePath] : [],
      }),
    );
    setMode("review");
    setDraftKind("theory");
    setIsMarkdownEditing(true);
    setStatus(`Theory 초안 생성: ${nextTheoryPath}`);
  }

  async function researchTheoryConcept(keyword: string) {
    setIsResearchingTheory(true);
    setStatus(`웹에서 concept 조사 중: ${keyword}`);
    try {
      const response = await fetch("/api/ai/theory-research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      if (!response.ok) throw new Error("Theory research failed");
      const data = (await response.json()) as TheoryResearchResult;
      setTheoryResearch(data);
      setStatus("조사 결과를 확인한 뒤 Theory 초안을 만들 수 있습니다");
      return data;
    } catch {
      setStatus("Theory concept 조사에 실패했습니다");
      return null;
    } finally {
      setIsResearchingTheory(false);
    }
  }

  async function save() {
    const path = draftKind === "theory" ? theoryPath : notePath;
    if (!path) {
      setStatus("저장할 경로를 만들 수 없습니다");
      setNotice({
        title: "저장할 수 없습니다",
        message: "저장할 경로를 만들 수 없습니다. 작업 위치, 출처, 제목을 확인하세요.",
        tone: "error",
      });
      return;
    }

    setStatus("GitHub 저장 요청 중");
    setNotice({
      title: "GitHub 저장 중",
      message: "선택한 저장 모드로 GitHub에 변경 사항을 보내는 중입니다.",
      tone: "progress",
    });
    try {
      const response = await fetch("/api/github/save", {
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
      if (!response.ok) throw new Error("GitHub save failed");
      setStatus(`GitHub 저장 요청 완료: ${path}`);
      setNotice({
        title: "GitHub 저장 완료",
        message: mode === "review" ? "Draft PR 생성 요청이 완료되었습니다." : "GitHub에 바로 저장되었습니다.",
        tone: "success",
      });
    } catch {
      setStatus("GitHub 저장 요청에 실패했습니다");
      setNotice({
        title: "GitHub 저장 실패",
        message: "GitHub 저장 요청이 실패했습니다. 설정과 권한을 확인하세요.",
        tone: "error",
      });
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#151611] text-[#f4efe4] lg:grid-cols-[300px_minmax(0,1fr)_340px]">
      {notice ? (
        <div className="fixed right-4 top-4 z-50 w-[min(calc(100vw-2rem),380px)]">
          <div
            role="status"
            aria-label={notice.title}
            className={[
              "flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur",
              notice.tone === "progress"
                ? "border-[#d8c69a]/35 bg-[#1d2118]/95 text-[#f4efe4]"
                : "",
              notice.tone === "success"
                ? "border-[#8d9a7b]/45 bg-[#243124]/95 text-[#f4efe4]"
                : "",
              notice.tone === "error" ? "border-[#c78269]/45 bg-[#33211d]/95 text-[#f4efe4]" : "",
            ].join(" ")}
          >
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d8c69a]/15 text-[#d8c69a]">
              {notice.tone === "progress" ? (
                <span className="size-4 rounded-full border-2 border-[#d8c69a]/35 border-t-[#d8c69a] animate-spin" />
              ) : notice.tone === "success" ? (
                <span className="text-sm font-bold">✓</span>
              ) : (
                <span className="text-sm font-bold">!</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#f3ecd8]">{notice.title}</p>
              <p className="mt-1 text-sm leading-5 text-[#d8d0bd]">{notice.message}</p>
            </div>
            <button
              type="button"
              aria-label="알림 닫기"
              onClick={() => setNotice(null)}
              className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-[#d8d0bd] transition hover:bg-[#f4efe4]/10 hover:text-[#f4efe4]"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <aside className="border-b border-[#2a2d22] bg-[#1d2118] p-5 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="text-lg font-semibold text-[#f3ecd8]">
            til-studio
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/blog"
              className="rounded-full bg-[#2a2f22] px-3 py-1.5 text-xs font-medium text-[#d8d0bd] hover:bg-[#343b2a]"
            >
              Blog
            </Link>
            <button
              type="button"
              aria-label="설정 열기"
              onClick={() => setIsSettingsOpen(true)}
              className="flex size-8 items-center justify-center rounded-full bg-[#2a2f22] text-sm text-[#d8d0bd] transition hover:bg-[#343b2a] hover:text-[#f4efe4]"
            >
              ⚙
            </button>
          </div>
        </div>
        <FolderTree
          tree={tree}
          selectedPath={selectedPath}
          draftKind={draftKind}
          visibleRootPaths={visibleRootPaths}
          onDraftKindChange={updateDraftKind}
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
            {draftKind === "note" ? (
              <button
                type="button"
                onClick={createNoteMarkdown}
                disabled={isBusy}
                className="self-end rounded-2xl bg-[#31513a] px-5 py-3 text-sm font-semibold text-[#f6efe2] shadow-[0_14px_30px_rgba(38,57,40,0.25)] transition hover:bg-[#294632] disabled:opacity-60"
              >
                {isBusy ? "글 초안 생성 중" : "글 초안 만들기"}
              </button>
            ) : null}
          </div>
          <div className="mt-4 rounded-2xl bg-[#2b2923] px-4 py-3 font-mono text-xs text-[#e8dcc7]">
            {(draftKind === "theory" ? theoryPath : notePath) || "선택을 마치면 저장 경로가 표시됩니다"}
          </div>
          <p className="mt-2 text-xs leading-5 text-[#6b6257]">
            {draftKind === "theory"
              ? "Theory는 오른쪽에서 concept을 조사하고 확인한 뒤, 선택한 topic 아래 theory 폴더로 저장됩니다."
              : "Notes는 선택한 topic과 source 아래 notes 폴더로 자동 저장됩니다."}
          </p>
          {draftKind === "note" ? (
            <SourceFolderPicker
              selectedPath={selectedPath}
              sourceName={sourceName}
              sources={selectedTopicSources}
              onSourceNameChange={setSourceName}
            />
          ) : null}
        </div>
        {draftKind === "note" ? (
          <NoteComposer draft={noteDraft} onChange={updateNoteDraft} />
        ) : null}
        <section className="mt-8 border-t border-[#c8bba7] pt-7">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#24221d]">미리보기</h2>
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
              Markdown 직접 수정
            </label>
          </div>
          {isMarkdownEditing ? (
            <FileEditor value={markdown} onChange={setMarkdown} />
          ) : (
            <div className="max-h-[520px] overflow-auto rounded-3xl bg-[#f3ebdf] p-6 shadow-inner">
              <MarkdownArticle markdown={publishMarkdown} />
            </div>
          )}
        </section>
        </div>
      </section>
      <aside className="bg-[#24281e] p-5 text-[#f4efe4] lg:min-h-screen lg:border-l lg:border-[#34382b]">
        <div className="sticky top-5 space-y-5">
        {draftKind === "note" ? (
          <SaveControls mode={mode} onModeChange={setMode} onSave={save} />
        ) : (
          <>
            <TheoryResearchPanel
              keyword={theoryKeyword}
              result={theoryResearch}
              isResearching={isResearchingTheory}
              onKeywordChange={setTheoryKeyword}
              onResearch={researchTheoryConcept}
              onCreateDraft={createTheoryFromResearch}
            />
            <div className="rounded-3xl bg-[#171b14] p-4 text-sm">
              <p className="font-semibold text-[#f4efe4]">Theory 저장 경로</p>
              <p className="mt-2 break-all font-mono text-xs text-[#a9a18f]">
                {theoryPath || "조사 결과로 초안을 만들면 경로가 표시됩니다"}
              </p>
            </div>
            <SaveControls mode="review" onModeChange={setMode} onSave={save} showQuick={false} />
          </>
        )}
        </div>
      </aside>
    </main>
  );
}
