"use client";

import { useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { theoryResearchSchema } from "@/lib/ai/schema";

const storageKey = "til-studio:working-draft:v1";
const sourceMetadataSchema = z.object({
  type: z.enum(["", "book", "lecture", "mentoring", "course", "etc"]),
  overview: z.string(),
  technologies: z.array(z.object({
    name: z.string(),
    badge: z.object({
      label: z.string(), color: z.string(), logo: z.string(), logoColor: z.string(),
    }).optional(),
  })),
  reference: z.string(),
});
const draftSchema = z.object({
  noteDraft: z.object({
    title: z.string(), created: z.string(), source: z.string(), learned: z.string(),
    confused: z.string(), questions: z.string(), conclusion: z.string(),
    experiments: z.string(), parentHref: z.string(),
  }),
  selectedPath: z.string(),
  sourceName: z.string(),
  sourceMetadata: sourceMetadataSchema,
  selectedSourceCodeSlugs: z.array(z.string()),
  isCreatingSource: z.boolean(),
  mode: z.enum(["quick", "review"]),
  draftKind: z.enum(["note", "theory"]),
  activeStep: z.enum(["where", "write", "preview", "publish"]),
  isMarkdownEditing: z.boolean(),
  theoryTitle: z.string(),
  theoryKeyword: z.string(),
  theoryResearch: theoryResearchSchema.nullable(),
  theoryMarkdown: z.string(),
  noteVersion: z.object({ markdown: z.string(), base: z.string() }).nullable(),
  previousLocation: z.object({
    selectedPath: z.string(), sourceName: z.string(), sourceMetadata: sourceMetadataSchema, selectedSourceCodeSlugs: z.array(z.string()),
    isCreatingSource: z.boolean(), draftKind: z.enum(["note", "theory"]),
    mode: z.enum(["quick", "review"]), isMarkdownEditing: z.boolean(),
  }).nullable().default(null),
});
const recordSchema = z.object({
  version: z.literal(1),
  savedAt: z.number().int().nonnegative(),
  draft: draftSchema,
});

export type StudioDraft = z.infer<typeof draftSchema>;
type DraftPatch = Partial<StudioDraft> | ((current: StudioDraft) => Partial<StudioDraft>);
type Snapshot = { draft: StudioDraft; savedAt: number | null; storageError: boolean };

function emptyDraft(created: string): StudioDraft {
  return {
    noteDraft: {
      title: "", created, source: "", learned: "", confused: "", questions: "",
      conclusion: "", experiments: "", parentHref: "../README.md",
    },
    selectedPath: "", sourceName: "",
    sourceMetadata: { type: "", overview: "", technologies: [], reference: "" },
    selectedSourceCodeSlugs: [], isCreatingSource: true, mode: "quick", draftKind: "note",
    activeStep: "write", previousLocation: null, isMarkdownEditing: false, theoryTitle: "", theoryKeyword: "",
    theoryResearch: null, theoryMarkdown: "", noteVersion: null,
  };
}

function newSnapshot(): Snapshot {
  const created = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return { draft: emptyDraft(created), savedAt: null, storageError: false };
}

function readSnapshot(raw: string | null): Snapshot {
  if (raw === null) return newSnapshot();
  const { draft, savedAt } = recordSchema.parse(JSON.parse(raw));
  return { draft, savedAt, storageError: false };
}

function same(left: unknown, right: unknown) {
  return left === right || JSON.stringify(left) === JSON.stringify(right);
}

// Apply only fields edited in this tab; keep independent changes from other tabs.
function mergeFields<T extends object>(base: T, local: T, remote: T): T {
  const result = { ...remote };
  for (const key of Object.keys(local) as (keyof T)[]) {
    if (same(local[key], base[key]) || same(local[key], remote[key])) continue;
    if (!same(remote[key], base[key])) throw new Error("Concurrent draft edit");
    result[key] = local[key];
  }
  return result;
}

function mergeDraft(base: StudioDraft, local: StudioDraft, remote: StudioDraft): StudioDraft {
  const { noteDraft: baseNote, sourceMetadata: baseSource, ...baseFields } = base;
  const { noteDraft: localNote, sourceMetadata: localSource, ...localFields } = local;
  const { noteDraft: remoteNote, sourceMetadata: remoteSource, ...remoteFields } = remote;
  return {
    ...mergeFields(baseFields, localFields, remoteFields),
    noteDraft: mergeFields(baseNote, localNote, remoteNote),
    sourceMetadata: mergeFields(baseSource, localSource, remoteSource),
  };
}

function createDraftStore() {
  const serverSnapshot: Snapshot = { draft: emptyDraft(""), savedAt: null, storageError: false };
  let current = serverSnapshot;
  let baseline = current;
  let baselineRaw: string | null | undefined;
  let pending = false;
  let notify: (() => void) | undefined;

  function show(snapshot: Snapshot) {
    current = snapshot;
    notify?.();
  }

  function accept(snapshot: Snapshot, raw: string | null) {
    baseline = snapshot;
    baselineRaw = raw;
    pending = false;
    show(snapshot);
  }

  function refresh() {
    if (pending) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === baselineRaw && !current.storageError) return;
      // Remember invalid data so visiting never replaces it. Editing can start a fresh draft.
      baselineRaw = raw;
      accept(readSnapshot(raw), raw);
    } catch {
      if (current === serverSnapshot) baseline = newSnapshot();
      show({ ...baseline, storageError: true });
    }
  }

  function onStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) refresh();
  }

  function updateDraft(patch: DraftPatch) {
    if (current === serverSnapshot) refresh();
    const changes = typeof patch === "function" ? patch(current.draft) : patch;
    let draft = { ...current.draft, ...changes };
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== baselineRaw) {
        if (raw === null && baseline.savedAt !== null) throw new Error("Draft reset in another tab");
        draft = mergeDraft(baseline.draft, draft, readSnapshot(raw).draft);
      }
      draft = draftSchema.parse(draft);
      const savedAt = Date.now();
      const serialized = JSON.stringify({ version: 1, draft, savedAt });
      window.localStorage.setItem(storageKey, serialized);
      accept({ draft, savedAt, storageError: false }, serialized);
    } catch {
      pending = true;
      show({ ...current, draft, storageError: true });
    }
  }

  function resetDraft(keepLocation = false) {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== baselineRaw && raw !== null) {
        // A stale tab must not discard another tab's newer saved draft.
        accept(readSnapshot(raw), raw);
        return false;
      }
      if (keepLocation && current.draft.selectedPath) {
        const { selectedPath, sourceName, sourceMetadata, isCreatingSource } = current.draft;
        const draft = { ...newSnapshot().draft, selectedPath, sourceName, sourceMetadata, isCreatingSource };
        const savedAt = Date.now();
        const serialized = JSON.stringify({ version: 1, draft, savedAt });
        window.localStorage.setItem(storageKey, serialized);
        accept({ draft, savedAt, storageError: false }, serialized);
        return true;
      }
      window.localStorage.removeItem(storageKey);
      accept(newSnapshot(), null);
      return true;
    } catch {
      show({ ...current, storageError: true });
      return false;
    }
  }

  return {
    updateDraft, resetDraft,
    getSnapshot: () => current,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      notify = listener;
      window.addEventListener("storage", onStorage);
      refresh();
      return () => {
        window.removeEventListener("storage", onStorage);
        notify = undefined;
      };
    },
  };
}

export function useStudioDraft() {
  const [store] = useState(createDraftStore);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...snapshot, updateDraft: store.updateDraft, resetDraft: store.resetDraft };
}
