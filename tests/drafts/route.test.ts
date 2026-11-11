import { beforeEach, expect, it, vi } from "vitest";
import { GET, PUT } from "@/app/api/draft/route";
import { emptyDraft, maxDraftBytes } from "@/lib/content/studio-draft";
const mocks = vi.hoisted(() => ({ authorize:vi.fn(), identity:vi.fn(), hosted:vi.fn(), read:vi.fn(), write:vi.fn() }));
vi.mock("@/lib/auth/access", () => ({authorizeAdminRequest:mocks.authorize,getAdminIdentity:mocks.identity}));
vi.mock("@/lib/auth/mode", () => ({isHostedMode:mocks.hosted}));
vi.mock("@/lib/drafts/storage", async original => ({...await original<typeof import("@/lib/drafts/storage")>(),readCloudDraft:mocks.read,writeCloudDraft:mocks.write}));
import { DraftConflict } from "@/lib/drafts/storage";
const current = {revision:"etag",draft:emptyDraft("2026-11-11"),updatedAt:"2026-11-11T00:00:00.000Z",mutationId:"saved"};
function request(body: unknown) {
  return new Request("https://blog.example/api/draft", {method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.hosted.mockReturnValue(true); mocks.authorize.mockResolvedValue(null);
  mocks.identity.mockResolvedValue({id:"90132183",name:"Owner"});
  mocks.read.mockResolvedValue(current); mocks.write.mockResolvedValue(current);
});
it("rejects visitors before parsing data or accessing storage and marks responses private", async () => {
  mocks.authorize.mockResolvedValue(new Response("Unauthorized",{status:401}));
  const put = await PUT(new Request("https://blog.example/api/draft",{method:"PUT",body:"broken"}));
  expect(put.status).toBe(401);
  expect((await GET(new Request("https://blog.example/api/draft"))).status).toBe(401);
  expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.write).not.toHaveBeenCalled();
});
it("uses authenticated server identity and returns only the validated draft contract", async () => {
  const response = await GET(new Request("https://blog.example/api/draft"));
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toEqual(current);
  expect(mocks.read).toHaveBeenCalledWith("90132183");
  const put = await PUT(request({expectedRevision:"etag",mutationId:"new",draft:current.draft}));
  expect(put.status).toBe(200);
  expect(mocks.write).toHaveBeenCalledWith("90132183",expect.objectContaining({expectedRevision:"etag"}));
});
it("requires complete schema, rejects client identities and oversized bodies before any write", async () => {
  for (const body of [{draft:{}},{expectedRevision:null,mutationId:"x",draft:null,owner:"attacker"},{expectedRevision:null,mutationId:"x",draft:{...current.draft,theoryMarkdown:"x".repeat(maxDraftBytes)}}]) {
    expect([400,413]).toContain((await PUT(request(body))).status);
  }
  expect(mocks.write).not.toHaveBeenCalled();
});
it("reports conflicts with both the revision and newer content, masks backend errors and disables cloud in desktop mode", async () => {
  mocks.write.mockRejectedValueOnce(new DraftConflict(current)).mockRejectedValueOnce(new Error("private token"));
  const input = {expectedRevision:null,mutationId:"x",draft:current.draft};
  const conflict = await PUT(request(input));
  expect(conflict.status).toBe(409);
  expect(await conflict.json()).toMatchObject({current});
  const failure = await PUT(request(input));
  expect(failure.status).toBe(503);
  expect(await failure.text()).not.toContain("private token");
  mocks.hosted.mockReturnValue(false);
  expect((await GET(new Request("https://blog.example/api/draft"))).status).toBe(404);
});
