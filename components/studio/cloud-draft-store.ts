import { z } from "zod";
import {
  cloudDraftSchema, draftMutationSchema, draftSchema, emptyDraft, exportDraft, maxDraftBytes,
  mergeDraft, parseDraftImport, recordSchema, same, todayDraft,
  type CloudDraft, type DraftMutation, type DraftPatch, type StudioDraft,
} from "@/lib/content/studio-draft";

export type CloudStatus = "local" | "loading" | "idle" | "pending" | "saving" | "saved" | "offline" | "conflict" | "error";
export type DraftRecovery = { key: string; draft: StudioDraft; savedAt: number };
export type DraftSnapshot = {
  draft: StudioDraft;
  savedAt: number | null;
  storageError: boolean;
  hydrated: boolean;
  cloudStatus: CloudStatus;
  cloudSavedAt: string | null;
  cloudError: string;
  conflict: { remote: CloudDraft } | null;
  recoveries: DraftRecovery[];
};
export const localDraftKey = "til-studio:working-draft:v1";
const backupSchema = z.object({
  version: z.literal(2), draft: draftSchema, savedAt: z.number().nonnegative(), dirty: z.boolean().default(true),
  base: cloudDraftSchema, known: z.boolean(), pending: draftMutationSchema.nullable(),
  recoveryOnly: z.boolean().default(false), resetFrom: draftSchema.nullable().default(null),
});
const emptyRemote: CloudDraft = { revision: null, draft: null, mutationId: null, updatedAt: null };

export function createCloudDraftStore(scope: string, options?: { storage: Storage; fetcher: typeof fetch }) {
  const prefix = "til-studio:cloud-backup:v2:" + encodeURIComponent(scope) + ":";
  let ownKey = prefix + crypto.randomUUID();
  const disk = () => options?.storage ?? window.localStorage;
  const fetcher = (...args: Parameters<typeof fetch>) => (options?.fetcher ?? fetch)(...args);
  const serverSnapshot: DraftSnapshot = {
    draft: emptyDraft(""), savedAt: null, storageError: false, hydrated: false,
    cloudStatus: "loading", cloudSavedAt: null, cloudError: "", conflict: null, recoveries: [],
  };
  let current = serverSnapshot;
  let base = emptyRemote;
  let known = false;
  let dirty = false;
  let pending: DraftMutation | null = null;
  let resetFrom: StudioDraft | null = null;
  let restored: { key: string; raw: string } | null = null;
  let initialized = false;
  let active = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let polling: ReturnType<typeof setInterval> | undefined;
  let operation: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function show(patch: Partial<DraftSnapshot>) {
    current = { ...current, ...patch };
    for (const listener of listeners) listener();
  }

  function recoveries() {
    const found: DraftRecovery[] = [];
    const backups: Array<{ key: string; raw: string; data: z.infer<typeof backupSchema> }> = [];
    try {
      const storage = disk();
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key || key === ownKey || !key.startsWith(prefix)) continue;
        const raw = storage.getItem(key);
        if (!raw) continue;
        const data = backupSchema.parse(JSON.parse(raw));
        backups.push({ key, raw, data });
        if (data.dirty || data.pending || data.recoveryOnly) found.push({ key, draft: data.draft, savedAt: data.savedAt });
      }
      const legacy = storage.getItem(localDraftKey);
      if (legacy) {
        const data = recordSchema.parse(JSON.parse(legacy));
        found.push({ key: localDraftKey, draft: data.draft, savedAt: data.savedAt });
      }
    } catch {
      show({ storageError: true });
    }
    found.sort((a, b) => b.savedAt - a.savedAt);
    show({ recoveries: found });
    return backups.sort((a, b) => Number(b.data.dirty || Boolean(b.data.pending)) - Number(a.data.dirty || Boolean(a.data.pending)) || b.data.savedAt - a.data.savedAt);
  }

  function persist() {
    try {
      if (!dirty && !pending && base.revision === null && current.savedAt === null) {
        disk().removeItem(ownKey);
      } else {
        disk().setItem(ownKey, JSON.stringify({
          version: 2, draft: current.draft, savedAt: current.savedAt ?? Date.now(),
          base, known, dirty, pending, resetFrom, recoveryOnly: false,
        }));
      }
      if (restored) {
        const prior = backupSchema.parse(JSON.parse(restored.raw));
        if (!prior.dirty && !prior.pending && disk().getItem(restored.key) === restored.raw) {
          disk().removeItem(restored.key);
          restored = null;
        }
      }
      show({ storageError: false });
    } catch {
      show({ storageError: true });
    }
  }

  function archiveLocal() {
    try {
      for (const key of [ownKey, restored?.key].filter((key): key is string => Boolean(key))) {
        const raw = disk().getItem(key);
        if (raw) {
          const data = backupSchema.parse(JSON.parse(raw));
          disk().setItem(key, JSON.stringify({ ...data, recoveryOnly: true }));
        }
      }
      ownKey = prefix + crypto.randomUUID();
      restored = null;
      recoveries();
    } catch {
      show({ storageError: true });
    }
  }

  function schedule() {
    clearTimeout(timer);
    if (active && known && (dirty || pending) && !current.conflict &&
        !["offline", "error"].includes(current.cloudStatus)) {
      timer = setTimeout(() => { void flush(); }, 500);
    }
  }

  function conflict(remote: CloudDraft) {
    show({ hydrated: true, conflict: { remote }, cloudStatus: "conflict", cloudError: "" });
    persist();
  }

  function reconcile(remote: CloudDraft) {
    if (pending && remote.mutationId === pending.mutationId && same(remote.draft, pending.draft)) {
      const submitted = pending.draft;
      pending = null;
      base = remote;
      known = true;
      if (submitted === null) {
        if (resetFrom && !same(resetFrom, current.draft)) {
          resetFrom = null;
          dirty = true;
          conflict(remote);
          return;
        }
        resetFrom = null;
        dirty = false;
        show({ draft: todayDraft(), savedAt: null });
      } else {
        dirty = !same(current.draft, submitted);
      }
    } else if (dirty && (!known || remote.revision !== base.revision)) {
      if (same(current.draft, remote.draft)) {
        dirty = false;
      } else if (known && base.draft && remote.draft) {
        try {
          const merged = mergeDraft(base.draft, current.draft, remote.draft);
          show({ draft: same(merged, current.draft) ? current.draft : merged });
          dirty = !same(merged, remote.draft);
        } catch {
          conflict(remote);
          return;
        }
      } else if (base.revision === null && remote.revision === null) {
        // The first local edit can create a cloud record after the initial read.
      } else {
        conflict(remote);
        return;
      }
      pending = null;
    } else if (!dirty && (!known || remote.revision !== base.revision)) {
      const draft = remote.draft ?? todayDraft();
      show({ draft: same(draft, current.draft) ? current.draft : draft, savedAt: remote.draft && remote.updatedAt ? Date.parse(remote.updatedAt) : null });
    }
    base = remote;
    known = true;
    show({
      hydrated: true, conflict: null, cloudSavedAt: remote.updatedAt, cloudError: "",
      cloudStatus: dirty || pending ? "pending" : remote.draft ? "saved" : "idle",
    });
    persist();
    schedule();
  }

  function failure(error: unknown) {
    show({
      hydrated: true, cloudStatus: "offline",
      cloudError: error instanceof Error ? error.message : "서버에 연결하지 못했습니다.",
    });
    persist();
  }

  async function readRemote() {
    const response = await fetcher("/api/draft", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403
      ? "다시 로그인한 뒤 동기화를 재시도하세요." : "서버 초안을 불러오지 못했습니다.");
    return cloudDraftSchema.parse(await response.json());
  }

  async function refresh() {
    if (operation) return operation;
    const work = async () => {
      try {
        const remote = await readRemote();
        if (current.conflict) {
          show({ conflict: { remote }, cloudSavedAt: remote.updatedAt });
          return;
        }
        reconcile(remote);
      } catch (error) {
        failure(error);
      }
    };
    operation = work().finally(() => { operation = null; schedule(); });
    return operation;
  }

  async function send(mutation: DraftMutation) {
    const body = JSON.stringify(mutation);
    if (new TextEncoder().encode(body).length > maxDraftBytes) throw new Error("초안은 1MB 이하로 서버에 저장할 수 있습니다.");
    const response = await fetcher("/api/draft", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body, keepalive: new TextEncoder().encode(body).length < 60_000,
    });
    const result = await response.json();
    if (response.status === 409) {
      reconcile(cloudDraftSchema.parse(result.current));
      return false;
    }
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403
      ? "다시 로그인한 뒤 동기화를 재시도하세요." : result.error || "서버 초안 저장에 실패했습니다.");
    reconcile(cloudDraftSchema.parse(result));
    if (restored && disk().getItem(restored.key) === restored.raw) {
      disk().removeItem(restored.key);
      restored = null;
      recoveries();
    }
    return true;
  }

  async function flush() {
    if (operation) return operation;
    if ((!dirty && !pending) || !known || current.conflict) return;
    clearTimeout(timer);
    pending ??= { expectedRevision: base.revision, mutationId: crypto.randomUUID(), draft: current.draft };
    persist();
    show({ cloudStatus: "saving", cloudError: "" });
    const mutation = pending;
    operation = send(mutation).then(() => {}, failure).finally(() => { operation = null; schedule(); });
    return operation;
  }

  function updateDraft(patch: DraftPatch) {
    const changes = typeof patch === "function" ? patch(current.draft) : patch;
    const draft = draftSchema.parse({ ...current.draft, ...changes });
    dirty = true;
    show({
      draft, savedAt: Date.now(),
      cloudStatus: current.conflict ? "conflict" : known ? "pending" : current.cloudStatus,
    });
    persist();
    schedule();
  }

  async function retry() {
    if (operation) await operation;
    await refresh();
  }

  async function resetDraft(keepLocation = false) {
    const before = current.draft;
    if (operation) await operation;
    if (dirty) await flush();
    if (!known || dirty || current.conflict || !same(before, current.draft)) return false;
    clearTimeout(timer);
    const previous = current.draft;
    const mutation: DraftMutation = { expectedRevision: base.revision, mutationId: crypto.randomUUID(), draft: null };
    pending = mutation;
    resetFrom = previous;
    persist();
    show({ cloudStatus: "saving" });
    let success = false;
    operation = (async () => {
      try {
        const response = await fetcher("/api/draft", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          credentials: "same-origin", body: JSON.stringify(mutation),
        });
        const result = await response.json();
        if (response.status === 409) { conflict(cloudDraftSchema.parse(result.current)); return; }
        if (!response.ok) throw new Error("새 초안을 시작하지 못했습니다. 다시 시도하세요.");
        const remote = cloudDraftSchema.parse(result);
        if (!same(current.draft, previous)) { pending = null; resetFrom = null; dirty = true; conflict(remote); return; }
        reconcile(remote);
        if (keepLocation) {
          const { selectedPath, sourceName, sourceMetadata, isCreatingSource } = previous;
          show({ draft: { ...current.draft, selectedPath, sourceName, sourceMetadata, isCreatingSource } });
          persist();
        }
        success = true;
      } catch (error) { failure(error); }
    })().finally(() => { operation = null; });
    await operation;
    return success;
  }

  async function resolveConflict(choice: "local" | "remote") {
    if (!current.conflict || operation) return;
    const remote = current.conflict.remote;
    pending = null;
    base = remote;
    known = true;
    if (choice === "remote") {
      archiveLocal();
      dirty = false;
      show({
        conflict: null, draft: remote.draft ?? todayDraft(),
        savedAt: remote.draft && remote.updatedAt ? Date.parse(remote.updatedAt) : null,
      });
      reconcile(remote);
    } else {
      dirty = true;
      show({ conflict: null, cloudStatus: "pending", cloudError: "" });
      persist();
      await flush();
    }
  }

  function importDraft(raw: string) {
    const draft = parseDraftImport(raw);
    if (dirty || pending) archiveLocal();
    pending = null;
    dirty = true;
    show({ draft, savedAt: Date.now(), conflict: known && base.draft ? { remote: base } : null,
      cloudStatus: known && base.draft ? "conflict" : "pending" });
    persist();
    schedule();
  }

  function onStorage(event: StorageEvent) {
    if (event.key === null || event.key?.startsWith(prefix) || event.key === localDraftKey) recoveries();
  }
  const onRefresh = () => { void refresh(); };
  const onVisibility = () => {
    if (document.visibilityState === "visible") onRefresh();
    else void flush();
  };
  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!dirty && !pending && !current.conflict) return;
    event.preventDefault();
    event.returnValue = "";
  }

  return {
    updateDraft, resetDraft, retry, resolveConflict, importDraft,
    exportDraft: () => exportDraft(current.draft),
    getSnapshot: () => current,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      active = true;
      if (!initialized) {
        initialized = true;
        show({ draft: todayDraft() });
        const backup = recoveries().find(item => !item.data.recoveryOnly);
        if (backup) {
          base = backup.data.base;
          known = backup.data.known;
          pending = backup.data.pending;
          resetFrom = backup.data.resetFrom;
          dirty = backup.data.dirty;
          restored = { key: backup.key, raw: backup.raw };
          show({ draft: backup.data.draft, savedAt: backup.data.savedAt });
        }
      }
      window.addEventListener("focus", onRefresh);
      window.addEventListener("online", onRefresh);
      window.addEventListener("storage", onStorage);
      window.addEventListener("beforeunload", onBeforeUnload);
      document.addEventListener("visibilitychange", onVisibility);
      clearInterval(polling);
      polling = setInterval(onRefresh, 30_000);
      void refresh();
      return () => {
        listeners.delete(listener);
        active = listeners.size > 0;
        if (active) return;
        clearTimeout(timer);
        clearInterval(polling);
        window.removeEventListener("focus", onRefresh);
        window.removeEventListener("online", onRefresh);
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("beforeunload", onBeforeUnload);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    },
  };
}
