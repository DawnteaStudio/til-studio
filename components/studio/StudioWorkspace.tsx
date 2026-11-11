"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { treeFromPaths } from "@/lib/content/indexer";
import { draftToNoteMarkdown, type StructuredNoteDraft } from "@/lib/content/note-draft";
import { buildNotePath, buildTheoryPath, makeSlug, matchingSourceNames, sourceNamesAtTopic, sourcePracticeSlugs, parentReadmePath } from "@/lib/content/paths";
import { addPracticeLinks, isValidPracticeName, readPracticeLinks, removePracticeLinks } from "@/lib/content/practice-links";
import { deriveStudyTarget } from "@/lib/content/studio-target";
import {
  defaultSaveModeForDraft,
  type StudioDraftKind,
  type StudioSourceOption,
} from "@/lib/content/studio-workspace";
import { createTheoryTemplate } from "@/lib/content/templates";
import type { ContentNode } from "@/lib/content/types";
import {
  folderVisibilityCookieName,
  folderVisibilityStorageKey,
  topLevelFolder,
} from "@/lib/content/visibility";
import { MarkdownArticle } from "@/components/public/MarkdownArticle";
import { FileEditor } from "./FileEditor";
import { FolderTree } from "./FolderTree";
import { PendingPracticePaths } from "./PracticeAttachments";
import { NoteComposer } from "./NoteComposer";
import { PublishPanel } from "./PublishPanel";
import { SettingsPanel } from "./SettingsPanel";
import { SourceFolderPicker } from "./SourceFolderPicker";
import { useStudioDraft } from "./useStudioDraft";
import { DraftSyncPanel, DraftSyncStatus } from "./DraftSyncPanel";
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

const studioSteps: Array<{ id: StudioStep; label: string }> = [
  { id: "where", label: "위치" },
  { id: "write", label: "작성" },
  { id: "preview", label: "미리보기" },
  { id: "publish", label: "저장" },
];

interface PracticeTarget {
  topic: string;
  source: string;
  practice: string;
}

function consumePracticeLink() {
  const url = new URL(window.location.href);
  for (const key of ["topic", "source", "practice"]) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

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
  try {
    const serialized = JSON.stringify(paths);
    window.localStorage.setItem(folderVisibilityStorageKey, serialized);
    document.cookie = `${folderVisibilityCookieName}=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // The current window can still use the selected folders when storage is unavailable.
  }
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
  const header = /^(\uFEFF?---)(\r?\n)([\s\S]*?)^---[ \t]*\r?$/m.exec(markdown);
  if (header?.index === 0) {
    if (/^created:[ \t]*/m.test(header[3])) return markdown;
    const opening = header[1] + header[2];
    return opening + "created: " + created + header[2] + markdown.slice(opening.length);
  }
  const eol = markdown.includes("\r\n") ? "\r\n" : "\n";
  return [`---`, `created: ${created}`, "---", "", markdown].join(eol);
}

function practiceSelection(markdown: string, storedNames: string[]) {
  try {
    const fromMarkdown = readPracticeLinks(markdown);
    const names = [...new Set([...fromMarkdown, ...storedNames])];
    return { markdown: names.length === fromMarkdown.length ? markdown : addPracticeLinks(markdown, names),
      names, error: "" };
  } catch (error) {
    return { markdown, names: storedNames,
      error: error instanceof Error ? error.message : "Markdown의 src 항목을 확인하세요." };
  }
}

export function StudioWorkspace({ cloudDraftKey }: { cloudDraftKey?: string } = {}) {
  const [tree, setTree] = useState(initialTree);
  const [repositoryPaths, setRepositoryPaths] = useState<string[]>([]);
  const draftStore = useStudioDraft(cloudDraftKey);
  const { draft, updateDraft, resetDraft, savedAt, storageError, hydrated, cloudStatus } = draftStore;
  const {
    selectedPath, sourceName, selectedSourceCodeSlugs, isCreatingSource, sourceMetadata,
    theoryTitle, noteDraft, noteVersion, theoryMarkdown, isMarkdownEditing, theoryKeyword,
    theoryResearch, mode, draftKind, activeStep,
  } = draft;
  const aiRequest = useRef<AbortController | null>(null);
  const [mobileLocationOpen, setMobileLocationOpen] = useState(false);
  const [reservationStep, setReservationStep] = useState<"topic" | "source" | "folder" | null>(null);
  const [practiceOffer, setPracticeOffer] = useState<PracticeTarget | null>(null);
  const [pendingAI, setPendingAI] = useState<StudioDraftKind | null>(null);
  const isBusy = pendingAI === "note";
  const isResearchingTheory = pendingAI === "theory";
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [treeRevision, setTreeRevision] = useState(0);
  const [visibleRootPaths, setVisibleRootPaths] = useState<string[]>([]);
  const [status, setStatus] = useState("TIL 레포 구조를 불러오는 중");
  const [notice, setNotice] = useState<StudioNotice | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const target = useMemo(() => deriveStudyTarget(selectedPath), [selectedPath]);
  const selectedTopicSources = useMemo<StudioSourceOption[]>(() =>
    sourceNamesAtTopic(repositoryPaths, selectedPath).map((name) => ({ name, path: `${selectedPath}/notes/${name}` })),
  [repositoryPaths, selectedPath]);
  const matchingSources = isCreatingSource
    ? matchingSourceNames(selectedTopicSources.map((source) => source.name), sourceName) : [];
  const notePath = useMemo(() => {
    if (!target) return "";
    if (!sourceName.trim() || !noteDraft.title.trim()) return "";
    return buildNotePath({
      ...target,
      source: sourceName,
      existingSourceName: isCreatingSource ? undefined : sourceName,
      title: noteDraft.title,
    });
  }, [isCreatingSource, noteDraft.title, sourceName, target]);
  const selectedSourcePath = useMemo(() => {
    if (!selectedPath || !sourceName.trim()) return "";
    const existingSource = selectedTopicSources.find(
      (source) => source.name === sourceName,
    );
    return existingSource?.path ?? `${selectedPath}/notes/${isCreatingSource ? makeSlug(sourceName) : sourceName}`;
  }, [isCreatingSource, selectedPath, selectedTopicSources, sourceName]);
  const sourceCodeOptions = useMemo(
    () => sourcePracticeSlugs(repositoryPaths, selectedSourcePath),
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
  const previousVersion = noteVersion && noteVersion.base !== generatedNoteMarkdown ? noteVersion : null;
  const noteMarkdown = noteVersion?.base === generatedNoteMarkdown ? noteVersion.markdown : generatedNoteMarkdown;
  const attachments = useMemo(() => practiceSelection(noteMarkdown, selectedSourceCodeSlugs), [noteMarkdown, selectedSourceCodeSlugs]);
  const noteSlug = makeSlug(noteDraft.title);
  const implicitPractice = sourceCodeOptions.includes(noteSlug) && !attachments.names.some((name) => sourceCodeOptions.includes(name))
    ? noteSlug : undefined;
  const publishMarkdown = draftKind === "note" ? attachments.markdown : theoryMarkdown;

  // A storage event can replace the draft from another open Studio window.
  useLayoutEffect(() => {
    aiRequest.current?.abort();
  }, [draft]);

  useEffect(() => () => {
    aiRequest.current?.abort();
    aiRequest.current = null;
  }, []);

  function finishAI(request: AbortController) {
    if (aiRequest.current !== request) return;
    aiRequest.current = null;
    setPendingAI(null);
    if (request.signal.aborted) {
      setNotice(null);
      setStatus("변경한 초안을 계속 작성할 수 있습니다");
    }
  }

  function cancelAI() {
    if (!aiRequest.current) return;
    aiRequest.current.abort();
    aiRequest.current = null;
    setPendingAI(null);
    setNotice(null);
    setStatus("변경한 초안을 계속 작성할 수 있습니다");
  }

  function changeDraft(patch: Parameters<typeof updateDraft>[0]) {
    cancelAI();
    updateDraft(patch);
  }

  const returnToMemo = useRef(false);
  const waitingForTopics = reservationStep === "topic" && isTreeLoading;
  useLayoutEffect(() => {
    if (activeStep === "write" && returnToMemo.current) {
      returnToMemo.current = false;
      document.getElementById("studio-note-memo")?.focus();
    }
    if (activeStep !== "where" || !reservationStep || waitingForTopics) return;
    document.querySelector<HTMLElement>(`[data-practice-focus="${reservationStep}"]`)?.focus();
  }, [activeStep, reservationStep, waitingForTopics, isCreatingSource]);

  function startPracticeReservation() {
    const hasMaterial = Boolean(selectedPath && (isCreatingSource ? makeSlug(sourceName) : sourceName));
    setReservationStep(!selectedPath ? "topic" : hasMaterial ? "folder" : "source");
    setMobileLocationOpen(!selectedPath);
    const hasSourceMetadata = sourceMetadata.type || sourceMetadata.overview || sourceMetadata.reference || sourceMetadata.technologies.length;
    changeDraft({ activeStep: "where", ...(selectedPath && !sourceName && !hasSourceMetadata
      ? { isCreatingSource: !selectedTopicSources.length } : {}) });
  }

  async function startNewDraft() {
    if (!window.confirm(cloudDraftKey ? "서버의 초안을 비우고 새 초안을 시작할까요? 다른 기기의 변경이 있으면 먼저 확인합니다." : "현재 기기에 보관한 초안을 지우고 새 초안을 시작할까요?")) return;
    cancelAI();
    setReservationStep(null);
    const didReset = await resetDraft(true);
    setNotice(null);
    setStatus(didReset ? "새 초안을 시작했습니다" : "초안을 초기화하지 못했습니다. 현재 내용을 확인하세요.");
  }

  function updateDraftKind(kind: StudioDraftKind) {
    setReservationStep(null);
    changeDraft({
      draftKind: kind,
      mode: defaultSaveModeForDraft(kind),
      activeStep: "write",
      isMarkdownEditing: kind === "theory",
    });
  }

  function selectStudyPath(path: string) {
    if (!path) {
      changeDraft({ selectedPath: "" });
      return;
    }
    const changed = path !== selectedPath;
    const step = reservationStep ? "where" : "write";
    if (changed) {
      changeDraft({
        selectedPath: path, activeStep: step, sourceName: "", selectedSourceCodeSlugs: [],
        isCreatingSource: !reservationStep || !sourceNamesAtTopic(repositoryPaths, path).length,
        sourceMetadata: { type: "", overview: "", technologies: [], reference: "" },
      });
    } else {
      changeDraft({ activeStep: step });
    }
    setMobileLocationOpen(false);
    if (reservationStep) setReservationStep(changed || !sourceName ? "source" : "folder");
  }

  function goToStep(step: StudioStep) {
    setReservationStep(null);
    changeDraft({ activeStep: step });
    setMobileLocationOpen(step === "where");
  }

  function applyPractice(link: PracticeTarget, keepLocation: boolean) {
    setReservationStep(null);
    changeDraft((current) => ({
      previousLocation: keepLocation ? current.previousLocation ?? {
        selectedPath: current.selectedPath, sourceName: current.sourceName,
        sourceMetadata: current.sourceMetadata, selectedSourceCodeSlugs: current.selectedSourceCodeSlugs,
        draftKind: current.draftKind, mode: current.mode, isCreatingSource: current.isCreatingSource,
        isMarkdownEditing: current.isMarkdownEditing,
      } : null,
      selectedPath: link.topic, sourceName: link.source, isCreatingSource: false,
      selectedSourceCodeSlugs: current.selectedPath === link.topic && current.sourceName === link.source
        ? [...new Set([...current.selectedSourceCodeSlugs, link.practice])] : [link.practice],
      draftKind: "note", mode: "quick",
      isMarkdownEditing: false, activeStep: "write",
    }));
    setMobileLocationOpen(false);
    setPracticeOffer(null);
    setStatus(`실습 연결 · ${link.source} / ${link.practice}`);
    consumePracticeLink();
  }

  const readPracticeLink = useEffectEvent((paths: string[]) => {
    const params = new URLSearchParams(window.location.search);
    if (!["topic", "source", "practice"].some((key) => params.has(key))) return;
    const topic = params.get("topic") ?? "";
    const source = params.get("source") ?? "";
    const practice = params.get("practice") ?? "";
    const prefix = `${topic}/notes/${source}/src/${practice}/`;
    const validSegment = (part: string) => part.length > 0 && ![".", ".."].includes(part) && !part.includes("/");
    if (topic.split("/").length !== 2 || !topic.split("/").every(validSegment) || !deriveStudyTarget(topic) ||
        !validSegment(source) || !isValidPracticeName(practice) ||
        !paths.some((path) => path.startsWith(prefix) && path.length > prefix.length && !path.endsWith("/.gitkeep"))) {
      setStatus("연결할 실습을 찾지 못했습니다. 학습 지도에서 실습을 다시 선택하세요.");
      consumePracticeLink();
      return;
    }
    const link = { topic, source, practice };
    if (savedAt !== null || storageError) setPracticeOffer(link);
    else applyPractice(link, false);
  });

  const treeLoaded = useRef(false);
  const practiceInitialized = useRef(false);
  useEffect(() => {
    if (!hydrated || isTreeLoading || !treeLoaded.current || practiceInitialized.current ||
        (cloudDraftKey && ["loading", "offline"].includes(cloudStatus))) return;
    practiceInitialized.current = true;
    readPracticeLink(repositoryPaths);
  }, [hydrated, cloudStatus, cloudDraftKey, isTreeLoading, repositoryPaths]);

  useEffect(() => {
    let isMounted = true;

    async function loadTree() {
      setIsTreeLoading(true);
      try {
        const response = await fetch("/api/github/tree", { cache: "no-store" });
        if (!response.ok) throw new Error("Repository tree unavailable");
        const data = (await response.json()) as { paths?: string[]; allPaths?: string[] };
        if (isMounted) {
          const paths = data.allPaths ?? data.paths ?? [];
          // Some study materials only contain code. One real file per source makes its folder selectable.
          const sampleFiles = new Map<string, string>();
          for (const path of paths) {
            const match = /^([^/]+\/[^/]+\/notes\/[^/]+)\/src\/[^/]+\/.+/.exec(path);
            if (match && !sampleFiles.has(match[1])) sampleFiles.set(match[1], path);
          }
          const treePaths = [...new Set([...(data.paths ?? paths), ...sampleFiles.values()])];
          const roots = [...new Set(treePaths.map(topLevelFolder).filter(Boolean))].sort();
          const saved = readVisibleRootPaths();
          setRepositoryPaths(paths);
          setTree(treeFromPaths(treePaths));
          const visibleRoots = saved.length ? roots.filter((root) => saved.includes(root)) : roots;
          setVisibleRootPaths(visibleRoots);
          setStatus("TIL 레포 구조를 불러왔습니다");
          treeLoaded.current = true;
          if (visibleRoots.length) persistVisibleRootPaths(visibleRoots);
        }
      } catch {
        if (isMounted) setStatus("TIL 레포 구조를 불러오지 못했습니다");
      } finally {
        if (isMounted) setIsTreeLoading(false);
      }
    }

    loadTree();

    return () => {
      isMounted = false;
    };
  }, [treeRevision]);

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
      changeDraft({ selectedPath: "", activeStep: "where" });
    }
  }

  function updateNoteDraft(
    field: Exclude<keyof StructuredNoteDraft, "created" | "parentHref">,
    value: string,
  ) {
    changeDraft((current) => ({ noteDraft: { ...current.noteDraft, [field]: value }, draftKind: "note" }));
  }

  function missingNoteMarkdownFields() {
    const missing = [];
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
    if (attachments.error) return;
    const removing = attachments.names.includes(slug);
    const additions = implicitPractice && implicitPractice !== slug ? [implicitPractice, slug] : [slug];
    const names = removing ? attachments.names.filter((name) => name !== slug) : [...attachments.names, ...additions];
    if (noteVersion && !previousVersion) {
      const markdown = removing ? removePracticeLinks(attachments.markdown, [slug]) : addPracticeLinks(attachments.markdown, additions);
      changeDraft({ selectedSourceCodeSlugs: names, noteVersion: { base: generatedNoteMarkdown, markdown } });
    } else {
      changeDraft({ selectedSourceCodeSlugs: names });
    }
  }

  function editNoteMarkdown(markdown: string) {
    const version = { base: generatedNoteMarkdown, markdown };
    try {
      changeDraft({ noteVersion: version, selectedSourceCodeSlugs: readPracticeLinks(markdown) });
    } catch {
      // Keep unfinished frontmatter exactly as typed so it can be corrected in the editor.
      changeDraft({ noteVersion: version });
    }
  }

  function openSource(name: string) {
    if (reservationStep) setReservationStep("folder");
    changeDraft((current) => current.selectedPath === selectedPath && current.sourceName === sourceName && current.isCreatingSource
      ? { sourceName: name, isCreatingSource: false } : {});
  }

  function acceptExistingSource(name: string | null, paths: string[]) {
    setRepositoryPaths((current) => [...new Set([...current, ...paths])]);
    if (name) openSource(name);
    setStatus(name ? `기존 학습 자료를 열었습니다 · ${name}` : "기존 학습 자료 목록에서 저장할 자료를 선택하세요.");
    setNotice(null);
  }

  async function createSourceWorkspace() {
    if (!target) {
      setStatus("먼저 학습 공간을 만들 주제를 선택하세요");
      setNotice({
        title: "작업 위치가 필요합니다",
        message: "분야와 주제를 선택한 뒤 학습 공간을 만들 수 있습니다.",
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
    if (matchingSources.length) {
      if (matchingSources.length === 1) {
        openSource(matchingSources[0]);
        setStatus(`기존 학습 자료를 열었습니다 · ${matchingSources[0]}`);
      } else {
        setStatus("이름이 비슷한 학습 자료가 여러 개입니다. 기존 학습 자료 목록에서 선택하세요.");
      }
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
      const result = await response.json() as { error?: string; sourceName?: string; sourcePaths?: string[] };
      if (response.status === 409 && result.error === "source_exists") {
        acceptExistingSource(result.sourceName ?? null, result.sourcePaths ?? []);
        return;
      }
      if (response.status === 409 || response.status === 422) {
        setStatus("학습 자료 공간을 생성하지 않았습니다");
        setNotice({
          title: "학습 공간을 확인하세요",
          message: response.status === 422 ? result.error ?? "README의 관리 마커를 확인하세요."
            : "저장소나 자료 이름이 변경되었습니다. 최신 목록에서 기존 학습 자료를 확인하세요.",
          tone: "error",
        });
        return;
      }
      if (!response.ok) throw new Error("Source workspace creation failed");
      const name = result.sourceName ?? makeSlug(sourceName);
      if (mode === "quick") {
        setRepositoryPaths((current) => [...new Set([...current, `${selectedPath}/notes/${name}/README.md`])]);
        openSource(name);
      }
      setStatus(`학습 공간 생성 완료: ${selectedPath}/notes/${name}`);
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

    if (previousVersion && !window.confirm("보관 중인 이전 편집본을 새 AI 초안으로 교체할까요?")) return;
    const request = new AbortController();
    aiRequest.current = request;
    setPendingAI("note");
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
        signal: request.signal,
      });
      if (!response.ok) throw new Error("Note cleanup failed");
      const data = (await response.json()) as { markdown?: string };
      if (request.signal.aborted) return;
      if (typeof data.markdown !== "string" || !data.markdown.trim()) throw new Error("Empty note draft");
      updateDraft({
        noteVersion: {
          base: generatedNoteMarkdown,
          markdown: ensureCreatedFrontmatter(data.markdown, noteDraft.created),
        },
        isMarkdownEditing: false,
        activeStep: "preview",
        mode: "quick",
      });
      setStatus("글 초안 생성 완료");
      setNotice({
        title: "글 초안 생성 완료",
        message: "초안이 완성되었습니다. 미리보기에서 확인하세요.",
        tone: "success",
      });
    } catch {
      if (request.signal.aborted) return;
      setStatus("글 초안 생성에 실패했습니다");
      setNotice({
        title: "글 초안 생성 실패",
        message: "잠시 뒤 다시 시도하거나 API 설정을 확인하세요.",
        tone: "error",
      });
    } finally {
      finishAI(request);
    }
  }

  function createTheoryFromResearch(result: TheoryResearchResult) {
    if (!target) {
      setStatus("먼저 개념 글을 저장할 분야와 주제를 선택하세요");
      return;
    }

    const nextTheoryPath = buildTheoryPath({
      ...target,
      title: result.title,
    });
    changeDraft({
      theoryTitle: result.title,
      theoryMarkdown: createTheoryTemplate({
        title: result.title,
        parentHref: parentReadmePath(nextTheoryPath),
        concept: result.concept,
        keyPoints: result.keyPoints,
        cautions: result.cautions,
        sources: result.sources,
        relatedNotes: repositoryPaths.includes(notePath) ? [notePath] : [],
      }),
      mode: "review",
      draftKind: "theory",
      isMarkdownEditing: true,
      activeStep: "preview",
    });
    setStatus(`Theory 초안 생성: ${nextTheoryPath}`);
  }

  async function researchTheoryConcept(keyword: string) {
    const request = new AbortController();
    aiRequest.current = request;
    setPendingAI("theory");
    setStatus(`웹에서 concept 조사 중: ${keyword}`);
    try {
      const response = await fetch("/api/ai/theory-research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword }),
        signal: request.signal,
      });
      if (!response.ok) throw new Error("Theory research failed");
      const data = (await response.json()) as TheoryResearchResult;
      if (request.signal.aborted) return;
      updateDraft({ theoryResearch: data });
      setStatus("조사 결과를 확인한 뒤 Theory 초안을 만들 수 있습니다");
    } catch {
      if (request.signal.aborted) return;
      setStatus("Theory concept 조사에 실패했습니다");
    } finally {
      finishAI(request);
    }
  }

  const publishPath = draftKind === "theory" ? theoryPath : notePath;
  const publishContent = draftKind === "note"
    ? ensureCreatedFrontmatter(publishMarkdown, noteDraft.created || seoulDate())
    : publishMarkdown;
  const validationError = draftKind === "note" && matchingSources.length ? "같은 이름의 자료가 있습니다. 학습 자료와 실습에서 기존 자료를 선택하세요."
    : !publishPath ? "저장할 경로를 만들 수 없습니다. 작업 위치, 학습 자료, 제목을 확인하세요."
    : draftKind === "note" && isCreatingSource && !sourceMetadata.type ? "새 학습 자료의 자료 유형을 선택하세요."
    : draftKind === "note" && attachments.error ? attachments.error
    : !(draftKind === "note" ? noteMarkdown : theoryMarkdown).trim() ? "발행할 내용이 없습니다." : undefined;

  const sourcePicker =
    draftKind === "note" ? (
      <SourceFolderPicker
        selectedPath={selectedPath}
        savePath={notePath || (!isCreatingSource && selectedSourcePath ? `${selectedSourcePath}/` : "")}
        sourceName={sourceName}
        sources={selectedTopicSources}
        isCreating={isCreatingSource}
        metadata={sourceMetadata}
        onSelectExisting={(sourceName) => {
          changeDraft({ sourceName, isCreatingSource: false, selectedSourceCodeSlugs: [] });
          if (reservationStep) setReservationStep("folder");
        }}
        onContinueReservation={reservationStep === "source" ? () => {
          if (matchingSources.length === 1) openSource(matchingSources[0]);
          else if (matchingSources.length > 1) changeDraft({ sourceName: "", isCreatingSource: false });
          else setReservationStep("folder");
        } : undefined}
        onStartCreating={() => {
          if (reservationStep) setReservationStep("source");
          changeDraft({
            sourceName: "", isCreatingSource: true, selectedSourceCodeSlugs: [],
            sourceMetadata: { type: "", overview: "", technologies: [], reference: "" },
          });
        }}
        onShowExisting={() => {
          if (reservationStep) setReservationStep("source");
          changeDraft({ sourceName: "", isCreatingSource: false, selectedSourceCodeSlugs: [] });
        }}
        onSourceNameChange={(sourceName) => changeDraft({ sourceName })}
        onMetadataChange={(sourceMetadata) => changeDraft({ sourceMetadata })}
        sourceCodeOptions={sourceCodeOptions}
        selectedSourceCodeSlugs={attachments.names}
        sourcePath={selectedSourcePath}
        repositoryPaths={repositoryPaths}
        practiceError={attachments.error}
        implicitPractice={implicitPractice}
        onRefreshPractices={() => setTreeRevision((revision) => revision + 1)}
        refreshingPractices={isTreeLoading}
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
      <aside className="studio-rail min-w-0 border-b px-4 py-2 lg:min-h-screen lg:p-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 lg:mb-6">
          <Link href="/" className="text-lg font-semibold text-[#f3ecd8]">
            til-studio
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/blog" className="studio-chip inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-xs font-medium text-[#d8d0bd]">
              Blog
            </Link>
            <button
              type="button"
              aria-label="설정 열기"
              onClick={() => setIsSettingsOpen(true)}
              className="studio-chip flex size-11 items-center justify-center rounded-full text-sm text-[#d8d0bd] hover:text-[#f4efe4]"
            >
              ⚙
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={mobileLocationOpen}
          aria-controls="studio-folders"
          className="mt-1 flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm text-[#f3ecd8] lg:hidden"
          onClick={() => setMobileLocationOpen((open) => !open)}
        >
          <span className="truncate">위치 · {selectedPath || "나중에 선택"}{sourceName && ` / ${sourceName}`}</span>
          <span className="shrink-0 font-semibold">{mobileLocationOpen ? "접기" : "변경"}</span>
        </button>
        <div id="studio-folders" className={mobileLocationOpen ? "pb-2 pt-3 lg:p-0" : "hidden lg:block"}>
          {reservationStep === "topic" && <p className="mb-3 text-sm font-semibold">코드와 노트를 함께 둘 주제를 선택하세요.</p>}
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
        </div>
      </aside>
      <section className="studio-stage min-w-0 px-3 py-4 text-[#201f1b] md:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="pb-4 text-sm text-[#5a5360]">
            <div className="flex flex-wrap items-start gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold leading-tight text-[#111827] md:text-4xl">학습 기록</h1>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                {status !== "TIL 레포 구조를 불러왔습니다" && status !== "TIL 레포 구조를 불러오는 중" ? (
                  <p role="status" className="text-sm font-medium text-[#204a78]">{status}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <DraftSyncStatus store={draftStore} />
                  <button type="button" onClick={startNewDraft} className="min-h-11 rounded-lg border border-[#204a78]/30 px-3 py-2 font-semibold">
                    새 초안
                  </button>
                </div>
              </div>
            </div>
            <DraftSyncPanel store={draftStore} hosted={Boolean(cloudDraftKey)} />
            <div
              role="tablist"
              aria-label="작성 단계"
              className="mt-3 grid grid-cols-4 gap-1 rounded-xl border border-[#204a78]/15 bg-[#e4dac9] p-1"
            >
              {studioSteps.map((step, index) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    role="tab"
                    id={`studio-tab-${step.id}`}
                    aria-controls="studio-step-panel"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => goToStep(step.id)}
                    onKeyDown={(event) => {
                      const nextIndex = {
                        ArrowRight: (index + 1) % studioSteps.length,
                        ArrowLeft: (index - 1 + studioSteps.length) % studioSteps.length,
                        Home: 0, End: studioSteps.length - 1,
                      }[event.key];
                      if (nextIndex === undefined) return;
                      event.preventDefault();
                      const next = studioSteps[nextIndex];
                      goToStep(next.id);
                      document.getElementById(`studio-tab-${next.id}`)?.focus();
                    }}
                    className={[
                      "min-h-11 rounded-lg px-2 text-center transition focus-visible:outline-2 focus-visible:outline-[#204a78]",
                      isActive
                        ? "bg-[#111827] text-[#f7f4ea] shadow-[0_14px_30px_rgba(17,24,39,0.18)]"
                        : "text-[#5f5549] hover:bg-white/55",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-semibold">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {practiceOffer ? (
            <section aria-label="실습 연결 확인" className="mb-4 space-y-3 rounded-xl border border-[#204a78]/30 bg-white/70 p-4 text-sm">
              <p>작성 중인 초안에 {practiceOffer.source} / {practiceOffer.practice} 실습을 연결할까요?</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-lg bg-[#204a78] px-4 py-2 text-white" onClick={() => applyPractice(practiceOffer, true)}>
                  이 초안에 실습 연결
                </button>
                <button type="button" className="rounded-lg border px-4 py-2" onClick={() => { setPracticeOffer(null); consumePracticeLink(); }}>
                  기존 초안 계속 작성
                </button>
              </div>
            </section>
          ) : null}
          {draft.previousLocation && (
            <button type="button" className="mb-3 text-sm font-semibold underline" onClick={() => {
              changeDraft({ ...draft.previousLocation, previousLocation: null, activeStep: "write" });
              setStatus("이전 작업 위치를 복원했습니다");
            }}>
              이전 작업 위치 복원
            </button>
          )}
          <div role="tabpanel" id="studio-step-panel" aria-labelledby={`studio-tab-${activeStep}`} tabIndex={0} className="grid min-w-0 gap-4">
            {activeStep === "where" ? (
              <section className="studio-paper rounded-2xl p-4 md:p-6">
                <h2 className="text-lg font-semibold">저장 위치</h2>
                <p className="mt-2 break-all text-sm">{selectedPath || "작업할 분야와 주제를 선택하세요."}</p>
                {sourcePicker}
                <button type="button" className="mt-4 rounded-xl bg-[#204a78] px-4 py-2 text-sm font-semibold text-white" onClick={() => {
                  returnToMemo.current = Boolean(reservationStep);
                  goToStep("write");
                }}>작성으로 돌아가기</button>
              </section>
            ) : null}

            {activeStep === "write" ? (
              draftKind === "note" ? (
                <>
                  <NoteComposer draft={noteDraft} onChange={updateNoteDraft}>
                    <div className="grid gap-2 text-left break-keep min-[360px]:grid-cols-2">
                      <button type="button" aria-label="코드를 올릴 위치 정하기" aria-describedby="practice-note-first" onClick={startPracticeReservation}
                        className="flex min-w-0 flex-col items-start rounded-xl border border-[#204a78]/25 bg-white/55 px-3 py-2 text-left hover:border-[#204a78]">
                        <span className="block text-xs text-[#504b40]">노트를 먼저 쓸 때</span>
                        <span className="mt-1 block text-sm font-bold text-[#204a78] underline underline-offset-4">코드를 올릴 위치 정하기</span>
                        <span id="practice-note-first" className="mt-1 block text-xs leading-5 text-[#504b40]">나중에 파일을 올리면 연결됩니다.</span>
                      </button>
                      <Link href="/map?view=unlinked" aria-label="GitHub에 올린 실습 찾기" aria-describedby="practice-code-first"
                        className="flex min-w-0 flex-col items-start rounded-xl border border-[#204a78]/25 bg-white/55 px-3 py-2 hover:border-[#204a78]">
                        <span className="block text-xs text-[#504b40]">코드를 먼저 올렸을 때</span>
                        <span className="mt-1 block text-sm font-bold text-[#204a78] underline underline-offset-4">GitHub에 올린 실습 찾기</span>
                        <span id="practice-code-first" className="mt-1 block text-xs leading-5 text-[#504b40]">새 노트를 쓰거나 이미 쓴 노트에 코드 링크를 추가하세요.</span>
                      </Link>
                    </div>
                  </NoteComposer>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => goToStep("preview")} className="rounded-xl bg-[#204a78] px-4 py-3 text-sm font-semibold text-white">
                      미리보기 열기
                    </button>
                    <button type="button" onClick={createNoteMarkdown} disabled={isBusy} className="rounded-xl border border-[#204a78]/30 px-4 py-3 text-sm font-semibold text-[#204a78] disabled:opacity-60">
                      {isBusy ? "글 초안 생성 중" : "글 초안 만들기"}
                    </button>
                  </div>
                  <details className="studio-paper min-w-0 rounded-2xl px-4 py-1">
                    <summary className="cursor-pointer py-3 text-sm font-semibold">학습 자료와 실습{sourceName && ` · ${sourceName}`}{attachments.names.length > 0 && ` / ${attachments.names.join(", ")}`}</summary>
                    {sourcePicker}
                  </details>
                </>
              ) : (
                <TheoryResearchPanel
                  keyword={theoryKeyword}
                  result={theoryResearch}
                  isResearching={isResearchingTheory}
                  onKeywordChange={(theoryKeyword) => changeDraft({ theoryKeyword })}
                  onResearch={researchTheoryConcept}
                  onCreateDraft={createTheoryFromResearch}
                />
              )
            ) : null}

            {activeStep === "preview" ? (
              <section className="studio-paper rounded-[2rem] p-5 md:p-7">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="mt-1 text-base font-semibold text-[#24221d]">미리보기</h2>
                    <p className="mt-1 text-sm text-[#6b6257]">
                      저장 단계에서 이 내용을 GitHub에 보냅니다.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-full bg-[#d8cebd] px-4 py-2 text-sm font-medium text-[#3a352e]">
                    <input
                      type="checkbox"
                      checked={isMarkdownEditing}
                      onChange={(event) => changeDraft({ isMarkdownEditing: event.target.checked })}
                      className="size-4 rounded border-[#968b78]"
                    />
                    Markdown 직접 수정
                  </label>
                </div>
                {draftKind === "note" && previousVersion ? (
                  <aside className="mb-4 space-y-3 rounded-2xl border border-[#204a78]/25 bg-[#fbf6ec] p-4 text-sm">
                    <p>메모가 바뀌어 최신 메모를 미리보기와 발행에 사용합니다.</p>
                    <details>
                      <summary className="cursor-pointer font-semibold">이전 편집본과 비교</summary>
                      <div className="my-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <h3 className="font-semibold">이전 편집본</h3>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words">{previousVersion.markdown || "(빈 편집본)"}</pre>
                        </div>
                        <div>
                          <h3 className="font-semibold">최신 메모</h3>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words">{generatedNoteMarkdown}</pre>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl bg-[#204a78] px-4 py-2 font-semibold text-white"
                        onClick={() => changeDraft({ noteVersion: { ...previousVersion, base: generatedNoteMarkdown } })}
                      >
                        이전 편집본 사용
                      </button>
                    </details>
                    {isMarkdownEditing ? (
                      <button
                        type="button"
                        className="rounded-xl border border-[#204a78] px-4 py-2 font-semibold"
                        onClick={() => changeDraft({ noteVersion: null })}
                      >
                        이전 편집본을 지우고 최신 메모 편집
                      </button>
                    ) : null}
                  </aside>
                ) : null}
                {draftKind === "note" && attachments.error && <p role="alert" className="mb-2 text-sm text-[#932d28]">{attachments.error}</p>}
                {isMarkdownEditing && !(draftKind === "note" && previousVersion) ? (
                  <FileEditor
                    value={publishMarkdown}
                    onChange={(markdown) => draftKind === "note" ? editNoteMarkdown(markdown) : changeDraft({ theoryMarkdown: markdown })}
                  />
                ) : (
                  <div className="max-h-[560px] overflow-auto rounded-3xl border border-[#204a78]/10 bg-[#fbf6ec] p-6 shadow-inner">
                    <MarkdownArticle markdown={publishMarkdown} />
                  </div>
                )}
              </section>
            ) : null}

            {activeStep === "publish" ? (
              <div className="grid gap-4">
                {draftKind === "note" && previousVersion ? (
                  <button type="button" className="justify-self-start text-sm font-semibold underline" onClick={() => goToStep("preview")}>
                    최신 메모를 저장합니다. 이전 편집본과 비교
                  </button>
                ) : null}
                <PublishPanel
                  key={publishPath}
                  path={publishPath}
                  content={publishContent}
                  mode={draftKind === "theory" ? "review" : mode}
                  showQuick={draftKind === "note"}
                  onModeChange={(mode) => changeDraft({ mode })}
                  onSourceConflict={acceptExistingSource}
                  onPublishedQuick={(path) => {
                    setRepositoryPaths((current) => [...new Set([...current, path])]);
                    if (isCreatingSource) openSource(makeSlug(sourceName));
                  }}
                  sourceMetadata={draftKind === "note" && isCreatingSource ? sourceMetadataPayload() ?? undefined : undefined}
                  validationError={validationError}
                />
                {draftKind === "note" && <PendingPracticePaths sourcePath={selectedSourcePath}
                  names={attachments.names.filter((name) => !sourceCodeOptions.includes(name))} />}
                {validationError ? (
                  <button type="button" className="justify-self-start rounded-lg border border-[#204a78]/30 px-3 py-2 text-sm" onClick={() => {
                    if (draftKind === "note" && attachments.error) changeDraft({ activeStep: "preview", isMarkdownEditing: true });
                    else goToStep(publishPath ? "write" : "where");
                  }}>
                    {draftKind === "note" && attachments.error ? "Markdown src 수정" : publishPath ? "작성으로 돌아가기" : "저장 위치 선택"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
