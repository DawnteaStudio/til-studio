import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCloudDraftStore } from "@/components/studio/cloud-draft-store";
import { emptyDraft, type CloudDraft } from "@/lib/content/studio-draft";

function memoryStorage(): Storage {
  const data = new Map<string,string>();
  return { get length(){return data.size}, key:index=>[...data.keys()][index]??null,
    getItem:key=>data.get(key)??null, setItem:(key,value)=>{data.set(key,value)}, removeItem:key=>{data.delete(key)},clear:()=>data.clear() };
}
let remote: CloudDraft;
let online: boolean;
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;
const cleanups: Array<()=>void> = [];
beforeEach(() => {
  vi.useFakeTimers();
  online = true;
  remote = {revision:null,draft:null,mutationId:null,updatedAt:null};
  fetcher = vi.fn<typeof fetch>(async (_url, options?: RequestInit) => {
    if (!online) throw new Error("offline");
    if (options?.method !== "PUT") return Response.json(remote);
    const body = JSON.parse(options.body as string);
    if (body.mutationId === remote.mutationId) return Response.json(remote);
    if (body.expectedRevision !== remote.revision) return Response.json({current:remote},{status:409});
    remote = {revision:crypto.randomUUID(),draft:body.draft,mutationId:body.mutationId,updatedAt:new Date().toISOString()};
    return Response.json(remote);
  });
});
afterEach(() => {cleanups.splice(0).forEach(fn=>fn());vi.useRealTimers();vi.restoreAllMocks()});
async function open(storage=memoryStorage()) {
  const store = createCloudDraftStore("owner:repo",{storage,fetcher});
  cleanups.push(store.subscribe(()=>{}));
  await vi.advanceTimersByTimeAsync(1);
  return store;
}
it("does not write on an untouched mount and restores the last keystroke after an offline close", async () => {
  const disk = memoryStorage();
  const first = await open(disk);
  expect(first.getSnapshot().hydrated).toBe(true);
  expect(fetcher.mock.calls.some(([,options])=>options?.method==="PUT")).toBe(false);
  online = false;
  first.updateDraft({theoryMarkdown:"last letter"});
  cleanups.pop()!();
  const reopened = await open(disk);
  expect(reopened.getSnapshot().draft.theoryMarkdown).toBe("last letter");
  expect(reopened.getSnapshot().cloudStatus).toBe("offline");
  online = true;
  await reopened.retry();
  await vi.advanceTimersByTimeAsync(700);
  expect(remote.draft?.theoryMarkdown).toBe("last letter");
});
it("merges distinct fields across devices but keeps both versions of an overlapping edit", async () => {
  remote = {revision:"base",draft:emptyDraft("2026-11-11"),mutationId:"base",updatedAt:new Date().toISOString()};
  const first = await open();
  const second = await open();
  first.updateDraft({theoryTitle:"first"});
  await vi.advanceTimersByTimeAsync(700);
  second.updateDraft({theoryMarkdown:"other field"});
  await vi.advanceTimersByTimeAsync(1400);
  expect(remote.draft).toMatchObject({theoryTitle:"first",theoryMarkdown:"other field"});
  first.updateDraft({theoryTitle:"owner's newer title"});
  await vi.advanceTimersByTimeAsync(1400);
  second.updateDraft({theoryTitle:"competing title"});
  await vi.advanceTimersByTimeAsync(700);
  expect(second.getSnapshot().cloudStatus).toBe("conflict");
  expect(second.getSnapshot().draft.theoryTitle).toBe("competing title");
  expect(second.getSnapshot().conflict?.remote.draft?.theoryTitle).toBe("owner's newer title");
  await second.resolveConflict("local");
  await vi.advanceTimersByTimeAsync(700);
  expect(remote.draft?.theoryTitle).toBe("competing title");
});
it("keeps a reset tombstone from resurrecting on a stale offline device", async () => {
  remote = {revision:"base",draft:emptyDraft("2026-11-11"),mutationId:"base",updatedAt:new Date().toISOString()};
  const first = await open(); const second = await open();
  expect(await first.resetDraft()).toBe(true);
  expect(remote.draft).toBeNull();
  second.updateDraft({theoryTitle:"old offline work"});
  await vi.advanceTimersByTimeAsync(700);
  expect(second.getSnapshot().cloudStatus).toBe("conflict");
  expect(remote.draft).toBeNull();
});
it("preserves edit ordering while a write is in flight and retries a lost response with the same id", async () => {
  const store = await open();
  const normal = fetcher.getMockImplementation()!;
  let resolve!: () => void;
  fetcher.mockImplementationOnce(async (...args) => {
    const result = await normal(...args);
    return new Promise<Response>(done=>{resolve=()=>done(result)});
  });
  store.updateDraft({theoryTitle:"first"});
  await vi.advanceTimersByTimeAsync(700);
  store.updateDraft({theoryTitle:"second"});
  expect(remote.draft?.theoryTitle).toBe("first");
  resolve();
  await vi.advanceTimersByTimeAsync(700);
  expect(remote.draft?.theoryTitle).toBe("second");
  fetcher.mockImplementationOnce(async (...args) => {await normal(...args);throw new Error("response lost")});
  store.updateDraft({theoryTitle:"third"});
  await vi.advanceTimersByTimeAsync(700);
  const savedId = remote.mutationId;
  await store.retry();
  await vi.advanceTimersByTimeAsync(700);
  expect(remote.mutationId).toBe(savedId);
  expect(store.getSnapshot().cloudStatus).toBe("saved");
});
it("keeps text typed after an ambiguous reset instead of clearing it when the response is recovered", async () => {
  remote = {revision:"base",draft:emptyDraft("2026-11-11"),mutationId:"base",updatedAt:new Date().toISOString()};
  const store = await open();
  const normal = fetcher.getMockImplementation()!;
  fetcher.mockImplementationOnce(async (...args) => {await normal(...args); throw new Error("response lost")});
  expect(await store.resetDraft()).toBe(false);
  store.updateDraft({theoryTitle:"typed after failed reset"});
  await store.retry();
  expect(store.getSnapshot().draft.theoryTitle).toBe("typed after failed reset");
  expect(store.getSnapshot().cloudStatus).toBe("conflict");
  expect(remote.draft).toBeNull();
});
it("opens the last successfully synchronized draft while offline and keeps a reset's selected location on refresh", async () => {
  const disk = memoryStorage();
  const store = await open(disk);
  store.updateDraft({selectedPath:"languages/java",sourceName:"Book",theoryTitle:"Cloud saved"});
  await vi.advanceTimersByTimeAsync(700);
  cleanups.pop()!();
  online = false;
  const reopened = await open(disk);
  expect(reopened.getSnapshot().draft.theoryTitle).toBe("Cloud saved");
  online = true;
  await reopened.retry();
  expect(await reopened.resetDraft(true)).toBe(true);
  await reopened.retry();
  expect(reopened.getSnapshot().draft.selectedPath).toBe("languages/java");
  expect(remote.draft).toBeNull();
});
it("replaces an unchanged clean local mirror after hydration without accumulating copies", async () => {
  const disk = memoryStorage();
  remote = {revision:"base",draft:emptyDraft("2026-11-11"),mutationId:"base",updatedAt:new Date().toISOString()};
  for (let i = 0; i < 4; i++) {
    await open(disk);
    cleanups.pop()!();
  }
  expect(disk.length).toBe(1);
});
it("keeps the losing local version recoverable after choosing the server version", async () => {
  const disk = memoryStorage();
  remote = {revision:"base",draft:emptyDraft("2026-11-11"),mutationId:"base",updatedAt:new Date().toISOString()};
  const store = await open(disk);
  remote = {...remote,revision:"other",draft:{...remote.draft!,theoryTitle:"remote"}};
  store.updateDraft({theoryTitle:"mine"});
  await vi.advanceTimersByTimeAsync(700);
  await store.resolveConflict("remote");
  expect(store.getSnapshot().draft.theoryTitle).toBe("remote");
  expect(store.getSnapshot().recoveries.some(item=>item.draft.theoryTitle==="mine")).toBe(true);
  cleanups.pop()!();
  const reopened = await open(disk);
  expect(reopened.getSnapshot().draft.theoryTitle).toBe("remote");
  expect(reopened.getSnapshot().recoveries.some(item=>item.draft.theoryTitle==="mine")).toBe(true);
});
it("warns on close only while cloud work is unsaved and flushes when the tab is hidden", async () => {
  const store = await open();
  const clean = new Event("beforeunload",{cancelable:true});
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
  store.updateDraft({theoryTitle:"last keystroke"});
  const unsaved = new Event("beforeunload",{cancelable:true});
  window.dispatchEvent(unsaved);
  expect(unsaved.defaultPrevented).toBe(true);
  vi.spyOn(document,"visibilityState","get").mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.advanceTimersByTimeAsync(1);
  expect(remote.draft?.theoryTitle).toBe("last keystroke");
  const saved = new Event("beforeunload",{cancelable:true});
  window.dispatchEvent(saved);
  expect(saved.defaultPrevented).toBe(false);
});
