"use client";

import { useState, useSyncExternalStore } from "react";
import { draftSchema, recordSchema, emptyDraft, exportDraft, mergeDraft, parseDraftImport, todayDraft, type DraftPatch } from "@/lib/content/studio-draft";
import { createCloudDraftStore, localDraftKey, type DraftSnapshot } from "./cloud-draft-store";
export type { StudioDraft } from "@/lib/content/studio-draft";

const storageKey = localDraftKey;
type Snapshot = DraftSnapshot;

function newSnapshot(): Snapshot {
  return {
    draft: todayDraft(), savedAt: null, storageError: false, hydrated: true,
    cloudStatus: "local", cloudSavedAt: null, cloudError: "", conflict: null, recoveries: [],
  };
}

function readSnapshot(raw: string | null): Snapshot {
  if (raw === null) return newSnapshot();
  const { draft, savedAt } = recordSchema.parse(JSON.parse(raw));
  return { ...newSnapshot(), draft, savedAt };
}

function createDraftStore() {
  const serverSnapshot: Snapshot = { ...newSnapshot(), draft: emptyDraft(""), hydrated: false };
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
      show({ ...baseline, storageError: true, hydrated: true });
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
      accept({ ...newSnapshot(), draft, savedAt }, serialized);
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
        accept({ ...newSnapshot(), draft, savedAt }, serialized);
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
    retry: async () => { if (pending) updateDraft({}); else refresh(); },
    resolveConflict: async () => {},
    importDraft: (raw: string) => updateDraft(parseDraftImport(raw)),
    exportDraft: () => exportDraft(current.draft),
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

export function useStudioDraft(cloudDraftKey?: string) {
  const [store] = useState(() => cloudDraftKey ? createCloudDraftStore(cloudDraftKey) : createDraftStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return {
    ...snapshot, updateDraft: store.updateDraft, resetDraft: store.resetDraft,
    retry: store.retry, resolveConflict: store.resolveConflict, importDraft: store.importDraft, exportDraft: store.exportDraft,
  };
}
