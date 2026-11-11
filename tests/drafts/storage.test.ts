import { beforeEach, expect, it, vi } from "vitest";
import { emptyDraft } from "@/lib/content/studio-draft";
import { readCloudDraft, writeCloudDraft, DraftConflict } from "@/lib/drafts/storage";

const blob = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@vercel/blob", () => blob);
let data: string | null;
let revision: string | null;
beforeEach(() => {
  vi.resetAllMocks();
  data = null;
  revision = null;
  blob.get.mockImplementation(async () => data === null ? null : ({
    statusCode: 200, stream: new Response(data).body,
    blob: { etag: revision, size: new TextEncoder().encode(data).length },
  }));
  blob.put.mockImplementation(async (_path, body, options) => {
    if (options.ifMatch ? options.ifMatch !== revision : revision !== null) throw new Error("precondition");
    data = body;
    revision = crypto.randomUUID();
    return { etag: revision };
  });
});
it("uses only private storage, reads origin and creates without overwriting", async () => {
  expect(await readCloudDraft("owner")).toEqual({ revision:null, draft:null, updatedAt:null, mutationId:null });
  const draft = emptyDraft("2026-11-11");
  draft.noteDraft.learned = "private draft";
  const saved = await writeCloudDraft("owner", { draft, expectedRevision:null, mutationId:"request-one" });
  expect(saved.draft).toEqual(draft);
  expect(blob.get).toHaveBeenCalledWith(expect.stringMatching(/^drafts\/[a-f0-9]+\.json$/), {access:"private", useCache:false});
  expect(blob.put).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({
    access:"private", addRandomSuffix:false, allowOverwrite:false,
  }));
  expect(blob.put.mock.calls[0][0]).not.toContain("owner");
});
it("uses the opaque revision for CAS, retains a tombstone and cannot resurrect from an old device", async () => {
  const draft = emptyDraft("2026-11-11");
  const first = await writeCloudDraft("owner", {draft,expectedRevision:null,mutationId:"first"});
  const reset = await writeCloudDraft("owner", {draft:null,expectedRevision:first.revision,mutationId:"reset"});
  expect(reset).toMatchObject({draft:null,mutationId:"reset"});
  expect(reset.revision).not.toBe(first.revision);
  expect(blob.put.mock.calls[1][2]).toMatchObject({ifMatch:first.revision});
  await expect(writeCloudDraft("owner", {draft,expectedRevision:first.revision,mutationId:"stale"})).rejects.toBeInstanceOf(DraftConflict);
  expect((await readCloudDraft("owner")).draft).toBeNull();
});
it("acknowledges a lost response idempotently and rejects reusing that id for a different draft", async () => {
  const input = {draft:emptyDraft("2026-11-11"),expectedRevision:null,mutationId:"same-request"};
  const first = await writeCloudDraft("owner", input);
  expect(await writeCloudDraft("owner", input)).toEqual(first);
  expect(blob.put).toHaveBeenCalledTimes(1);
  await expect(writeCloudDraft("owner", {...input,draft:null})).rejects.toBeInstanceOf(DraftConflict);
});
it("returns the newer draft when storage changes between read and conditional put", async () => {
  const draft = emptyDraft("2026-11-11");
  blob.put.mockImplementationOnce(async () => {
    revision = "another-device";
    data = JSON.stringify({version:1, draft:{...draft,theoryTitle:"remote"},mutationId:"other",updatedAt:new Date().toISOString()});
    throw new Error("precondition");
  });
  await expect(writeCloudDraft("owner", {draft,expectedRevision:null,mutationId:"mine"}))
    .rejects.toMatchObject({ current: expect.objectContaining({revision:"another-device",draft:expect.objectContaining({theoryTitle:"remote"})}) });
});
it("fails closed on corrupt stored data instead of replacing it", async () => {
  data = "{broken"; revision = "broken";
  await expect(writeCloudDraft("owner", {draft:null,expectedRevision:null,mutationId:"reset"})).rejects.toThrow();
  expect(blob.put).not.toHaveBeenCalled();
});
