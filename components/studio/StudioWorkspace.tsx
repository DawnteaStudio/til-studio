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
import {
  SourceFolderPicker,
  type SourceMetadataForm,
} from "./SourceFolderPicker";
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

type StudioStep = "where" | "write" | "preview" | "publish";

const studioSteps: Array<{ id: StudioStep; label: string; caption: string }> = [
  { id: "where", label: "Where", caption: "위치" },
  { id: "write", label: "Write", caption: "작성" },
  { id: "preview", label: "Preview", caption: "확인" },
  { id: "publish", label: "Publish", caption: "저장" },
];

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

function seoulDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function ensureCreatedFrontmatter(markdown: string, created: string): string {
  if (/^---\s*\n[\s\S]*?^created:\s*/m.test(markdown)) return markdown;
  return `---\ncreated: ${created}\n---\n\n${markdown.trimStart()}`;
}

function applySourceCodeLinks(markdown: string, sourceCodeSlugs: string[]): string {
  const uniqueSlugs = [...new Set(sourceCodeSlugs.filter(Boolean))];
  const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!frontmatterMatch) {
    if (!uniqueSlugs.length) return markdown;
    return `---\nsrc:\n${uniqueSlugs.map((slug) => `  - ${slug}`).join("\n")}\n---\n\n${markdown.trimStart()}`;
  }

  const body = markdown.slice(frontmatterMatch[0].length).trimStart();
  const cleanedLines: string[] = [];
  let isSkippingSourceList = false;
  for (const line of frontmatterMatch[1].split(/\r?\n/)) {
    if (/^src:\s*/.test(line)) {
      isSkippingSourceList = /^src:\s*$/.test(line);
      continue;
    }
    if (isSkippingSourceList && /^\s*-\s*/.test(line)) continue;
    isSkippingSourceList = false;
    if (line.trim()) cleanedLines.push(line);
  }
  const srcLines = uniqueSlugs.length
    ? ["src:", ...uniqueSlugs.map((slug) => `  - ${slug}`)]
    : [];
  const createdIndex = cleanedLines.findIndex((line) => /^created:\s*/.test(line));
  const nextFrontmatter = [...cleanedLines];
  if (srcLines.length) {
    nextFrontmatter.splice(
      createdIndex === -1 ? 0 : createdIndex + 1,
      0,
      ...srcLines,
    );
  }

  return `---\n${nextFrontmatter.join("\n")}\n---\n\n${body}`;
}

function sourceCodeSlugsForSource(paths: string[], sourcePath: string): string[] {
  if (!sourcePath) return [];
  const prefix = `${sourcePath}/src/`;
  return [
    ...new Set(
      paths
        .filter((path) => path.startsWith(prefix))
        .map((path) => path.slice(prefix.length).split("/")[0])
        .filter((slug) => Boolean(slug) && slug !== ".gitkeep"),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

export function StudioWorkspace() {
  const [tree, setTree] = useState(initialTree);
  const [repositoryPaths, setRepositoryPaths] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [selectedSourceCodeSlugs, setSelectedSourceCodeSlugs] = useState<string[]>([]);
  const [isCreatingSource, setIsCreatingSource] = useState(true);
  const [sourceMetadata, setSourceMetadata] = useState<SourceMetadataForm>({
    type: "",
    overview: "",
    technologies: [],
    reference: "",
  });
  const [theoryTitle, setTheoryTitle] = useState("");
  const [noteDraft, setNoteDraft] = useState<StructuredNoteDraft>({
    title: "",
    created: seoulDate(),
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
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [visibleRootPaths, setVisibleRootPaths] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<StudioStep>("where");
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
  const selectedSourcePath = useMemo(() => {
    if (!selectedPath || !sourceName.trim()) return "";
    const existingSource = selectedTopicSources.find(
      (source) => source.name === sourceName,
    );
    return existingSource?.path ?? `${selectedPath}/notes/${makeSlug(sourceName)}`;
  }, [selectedPath, selectedTopicSources, sourceName]);
  const sourceCodeOptions = useMemo(
    () => sourceCodeSlugsForSource(repositoryPaths, selectedSourcePath),
    [repositoryPaths, selectedSourcePath],
  );
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
    setActiveStep("write");
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

  function selectStudyPath(path: string) {
    setSelectedPath(path);
    if (path) setActiveStep("write");
  }

  useEffect(() => {
    let isMounted = true;

    async function loadTree() {
      setIsTreeLoading(true);
      try {
        const response = await fetch("/api/github/tree");
        if (!response.ok) return;
        const data = (await response.json()) as { paths?: string[]; allPaths?: string[] };
        if (isMounted && data.paths?.length) {
          const roots = [...new Set(data.paths.map(topLevelFolder).filter(Boolean))].sort();
          const saved = readVisibleRootPaths();
          setRepositoryPaths(data.allPaths?.length ? data.allPaths : data.paths);
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
      setActiveStep("where");
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

  function sourceMetadataPayload() {
    if (!sourceMetadata.type) return null;
    return {
      name: sourceName.trim(),
      type: sourceMetadata.type,
      overview: sourceMetadata.overview.trim() || undefined,
      technologies: sourceMetadata.technologies,
      references: sourceMetadata.reference.trim()
        ? [sourceMetadata.reference.trim()]
        : [],
    };
  }

  function toggleSourceCode(slug: string) {
    setSelectedSourceCodeSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug].sort((left, right) => left.localeCompare(right)),
    );
  }

  async function createSourceWorkspace() {
    if (!target) {
      setStatus("먼저 왼쪽에서 학습 공간을 만들 topic을 선택하세요");
      setNotice({
        title: "작업 위치가 필요합니다",
        message: "왼쪽에서 area와 topic을 선택한 뒤 학습 공간을 만들 수 있습니다.",
        tone: "error",
      });
      return;
    }
    if (!sourceName.trim()) {
      setStatus("새 학습 자료 이름을 입력하세요");
      setNotice({
        title: "학습 자료 이름이 필요합니다",
        message: "새 학습 공간에 사용할 책, 강의, 자료 이름을 입력하세요.",
        tone: "error",
      });
      return;
    }
    const metadata = sourceMetadataPayload();
    if (!metadata) {
      setStatus("새 학습 자료의 자료 유형을 선택하세요");
      setNotice({
        title: "자료 유형이 필요합니다",
        message: "책, 강의, 멘토링, 코스, 기타 중 하나를 선택하세요.",
        tone: "error",
      });
      return;
    }

    setIsCreatingWorkspace(true);
    setStatus("학습 공간 생성 요청 중");
    setNotice({
      title: "학습 공간 생성 중",
      message: "README와 note/src 폴더를 GitHub에 준비하는 중입니다.",
      tone: "progress",
    });
    try {
      const response = await fetch("/api/github/source", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          topicPath: selectedPath,
          sourceName: sourceName.trim(),
          sourceMetadata: metadata,
        }),
      });
      if (!response.ok) throw new Error("Source workspace creation failed");
      setStatus(`학습 공간 생성 완료: ${selectedPath}/notes/${sourceName.trim()}`);
      setNotice({
        title: "학습 공간 생성 완료",
        message: "README와 note/src 폴더가 준비되었습니다.",
        tone: "success",
      });
    } catch {
      setStatus("학습 공간 생성 요청에 실패했습니다");
      setNotice({
        title: "학습 공간 생성 실패",
        message: "GitHub 설정과 권한을 확인한 뒤 다시 시도하세요.",
        tone: "error",
      });
    } finally {
      setIsCreatingWorkspace(false);
    }
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
        setMarkdown(ensureCreatedFrontmatter(data.markdown, noteDraft.created));
        setIsMarkdownEditing(false);
      }
      setMode("quick");
      setDraftKind("note");
      setActiveStep("preview");
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
    setActiveStep("preview");
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
        message: "저장할 경로를 만들 수 없습니다. 작업 위치, 학습 자료, 제목을 확인하세요.",
        tone: "error",
      });
      return;
    }
    if (draftKind === "note" && isCreatingSource && !sourceMetadata.type) {
      setStatus("새 학습 자료의 자료 유형을 선택하세요");
      setNotice({
        title: "자료 유형이 필요합니다",
        message: "책, 강의, 멘토링, 코스, 기타 중 하나를 선택하세요.",
        tone: "error",
      });
      return;
    }
    const content =
      draftKind === "note"
        ? applySourceCodeLinks(
            ensureCreatedFrontmatter(publishMarkdown, noteDraft.created || seoulDate()),
            selectedSourceCodeSlugs,
          )
        : publishMarkdown;

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
          sourceMetadata:
            draftKind === "note" && isCreatingSource && sourceMetadata.type
              ? sourceMetadataPayload()
              : undefined,
          changes: [
            {
              path,
              content,
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

  const sourcePicker =
    draftKind === "note" ? (
      <SourceFolderPicker
        selectedPath={selectedPath}
        savePath={notePath}
        sourceName={sourceName}
        sources={selectedTopicSources}
        isCreating={isCreatingSource}
        metadata={sourceMetadata}
        onSelectExisting={(source) => {
          setSourceName(source);
          setIsCreatingSource(false);
          setSelectedSourceCodeSlugs([]);
        }}
        onStartCreating={() => {
          setSourceName("");
          setIsCreatingSource(true);
          setSelectedSourceCodeSlugs([]);
          setSourceMetadata({
            type: "",
            overview: "",
            technologies: [],
            reference: "",
          });
        }}
        onShowExisting={() => {
          setSourceName("");
          setIsCreatingSource(false);
          setSelectedSourceCodeSlugs([]);
        }}
        onSourceNameChange={setSourceName}
        onMetadataChange={setSourceMetadata}
        sourceCodeOptions={sourceCodeOptions}
        selectedSourceCodeSlugs={selectedSourceCodeSlugs}
        onToggleSourceCode={toggleSourceCode}
        onCreateSourceWorkspace={createSourceWorkspace}
        isCreatingWorkspace={isCreatingWorkspace}
      />
    ) : null;

  return (
    <main className="studio-shell grid min-h-screen grid-cols-1 text-[#f4efe4] lg:grid-cols-[320px_minmax(0,1fr)]">
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
      <aside className="studio-rail border-b p-5 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="text-lg font-semibold text-[#f3ecd8]">
            til-studio
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/blog" className="studio-chip rounded-full px-3 py-1.5 text-xs font-medium text-[#d8d0bd]">
              Blog
            </Link>
            <button
              type="button"
              aria-label="설정 열기"
              onClick={() => setIsSettingsOpen(true)}
              className="studio-chip flex size-8 items-center justify-center rounded-full text-sm text-[#d8d0bd] hover:text-[#f4efe4]"
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
          onSelectPath={selectStudyPath}
          isLoading={isTreeLoading}
        />
      </aside>
      <section className="studio-stage min-w-0 px-5 py-6 text-[#201f1b] md:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="studio-fade-in pb-7 text-sm text-[#5a5360]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[#837969]">
                  Writing Session
                </p>
                <h1 className="mt-3 text-4xl font-semibold leading-tight text-[#111827] md:text-5xl">
                  새 학습 기록 작성
                </h1>
              </div>
              <div className="max-w-full rounded-full bg-[#111827] px-4 py-2 text-xs font-medium text-[#f7f4ea] shadow-[0_16px_34px_rgba(17,24,39,0.22)]">
                {status}
              </div>
            </div>
            <div
              role="tablist"
              aria-label="Studio workflow"
              className="mt-7 grid gap-2 rounded-2xl border border-[#204a78]/15 bg-[#e4dac9] p-2 shadow-inner md:grid-cols-4"
            >
              {studioSteps.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveStep(step.id)}
                    className={[
                      "h-16 rounded-xl px-3 text-left transition",
                      isActive
                        ? "bg-[#111827] text-[#f7f4ea] shadow-[0_14px_30px_rgba(17,24,39,0.18)]"
                        : "text-[#5f5549] hover:bg-white/55",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-semibold">{step.label}</span>
                    <span className="mt-1 block text-xs opacity-75">{step.caption}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5">
            {activeStep === "where" ? (
              <section className="studio-paper rounded-[2rem] p-5 md:p-7">
                <p className="text-xs font-semibold uppercase text-[#756b5e]">Where</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#25221c]">
                  작업 위치부터 정리하기
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6b6257]">
                  작업 위치를 먼저 정하면 나머지 도구는 조용히 접어둘게요.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                  <label className="space-y-1">
                    <span className="block text-xs font-semibold text-[#5e564c]">작업 위치</span>
                    <div className="flex min-h-12 items-center rounded-2xl border border-[#204a78]/15 bg-white/55 px-4 text-sm text-[#39352d] shadow-inner">
                      {selectedPath || "왼쪽에서 area와 topic을 선택하세요"}
                    </div>
                  </label>
                  {draftKind === "note" ? (
                    <button
                      type="button"
                      onClick={createNoteMarkdown}
                      disabled={isBusy}
                      className="studio-action self-end rounded-2xl bg-[#204a78] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(32,74,120,0.28)] disabled:opacity-60"
                    >
                      {isBusy ? "글 초안 생성 중" : "글 초안 만들기"}
                    </button>
                  ) : null}
                </div>
                {sourcePicker}
              </section>
            ) : null}

            {activeStep === "write" ? (
              draftKind === "note" ? (
                <>
                  <section className="studio-paper rounded-[2rem] p-5 md:p-7">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase text-[#756b5e]">Write</p>
                        <h2 className="mt-2 text-2xl font-semibold text-[#25221c]">
                          메모 흐름 정리
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#6b6257]">
                          위치와 자료를 정한 뒤 바로 메모를 쌓고 초안을 만들 수 있습니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={createNoteMarkdown}
                        disabled={isBusy}
                        className="studio-action self-start rounded-2xl bg-[#204a78] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(32,74,120,0.28)] disabled:opacity-60 md:self-end"
                      >
                        {isBusy ? "글 초안 생성 중" : "글 초안 만들기"}
                      </button>
                    </div>
                  </section>
                  {sourcePicker}
                  <NoteComposer draft={noteDraft} onChange={updateNoteDraft} />
                </>
              ) : (
                <TheoryResearchPanel
                  keyword={theoryKeyword}
                  result={theoryResearch}
                  isResearching={isResearchingTheory}
                  onKeywordChange={setTheoryKeyword}
                  onResearch={researchTheoryConcept}
                  onCreateDraft={createTheoryFromResearch}
                />
              )
            ) : null}

            {activeStep === "preview" ? (
              <section className="studio-paper rounded-[2rem] p-5 md:p-7">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#756b5e]">Preview</p>
                    <h2 className="mt-1 text-base font-semibold text-[#24221d]">미리보기</h2>
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
                  <div className="max-h-[560px] overflow-auto rounded-3xl border border-[#204a78]/10 bg-[#fbf6ec] p-6 shadow-inner">
                    <MarkdownArticle markdown={publishMarkdown} />
                  </div>
                )}
              </section>
            ) : null}

            {activeStep === "publish" ? (
              <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="studio-paper rounded-[2rem] p-5 md:p-7">
                  <p className="text-xs font-semibold uppercase text-[#756b5e]">Publish</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#25221c]">
                    저장 전 마지막 확인
                  </h2>
                  <div className="mt-5 rounded-2xl bg-[#111827] px-4 py-3 text-[#e8dcc7] shadow-[0_18px_45px_rgba(17,24,39,0.18)]">
                    <p className="text-xs font-semibold text-[#bdb19d]">이 글이 저장될 위치</p>
                    <p className="mt-1 break-all font-mono text-xs leading-5">
                      {(draftKind === "theory" ? theoryPath : notePath) || "선택을 마치면 저장 경로가 표시됩니다"}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#6b6257]">
                    {draftKind === "theory"
                      ? "Theory는 선택한 topic 아래 theory 폴더로 저장됩니다."
                      : "Notes는 선택한 topic과 학습 자료 아래 note 폴더로 자동 저장됩니다."}
                  </p>
                </div>
                <SaveControls
                  mode={draftKind === "theory" ? "review" : mode}
                  onModeChange={setMode}
                  onSave={save}
                  showQuick={draftKind === "note"}
                />
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
