import { beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/github/save/route";

const github = vi.hoisted(() => vi.fn());
vi.mock("@/lib/github/client", () => ({ createInstallationOctokit: async () => ({ request: github }) }));
vi.mock("@/lib/settings/runtime-settings", () => ({ getRuntimeSetting: () => undefined }));

const owner = "DawnteaStudio";
const repo = "TIL";
const path = "languages/c/theory/pointers.md";
const branch = "trunk";
const expected = { owner, repo, branch, path, sha: "original" };

function post(sha: string | null, mode: "quick" | "review" = "quick") {
  return POST(new Request("http://localhost/api/github/save", {
    method: "POST", body: JSON.stringify({
      expected: { ...expected, sha }, mode, message: "Save note", changes: [{ path, content: "# 새 내용" }],
    }),
  }));
}

let targetSha: string | null;
let advanceAtRead: number;
let extraPaths: string[];
let gitRefReads: number;
beforeEach(() => {
  targetSha = "original";
  advanceAtRead = Infinity;
  extraPaths = [];
  gitRefReads = 0;
  github.mockReset().mockImplementation(async (route: string, params: Record<string, unknown>) => {
    if (route === "GET /repos/{owner}/{repo}") return { data: { default_branch: branch } };
    if (route.endsWith("/git/ref/{ref}")) {
      gitRefReads++;
      return { data: { object: { sha: gitRefReads >= advanceAtRead ? "new-head" : "head" } } };
    }
    if (route.endsWith("/git/trees/{tree_sha}")) return { data: { tree: [...(targetSha ? [{ type: "blob", path, sha: targetSha }] : []), ...extraPaths.map((path) => ({ type: "blob", path, sha: "other" }))] } };
    if (route.endsWith("/contents/{path}")) {
      if (params.path !== path || !targetSha) throw Object.assign(new Error("File missing"), { status: 404 });
      return { data: { type: "file", encoding: "base64", sha: targetSha, content: Buffer.from("# 기존 내용").toString("base64") } };
    }
    if (route.endsWith("/git/commits/{commit_sha}")) return { data: { tree: { sha: "tree" } } };
    if (route.endsWith("/pulls")) return { data: { html_url: "https://github.com/DawnteaStudio/TIL/pull/9" } };
    return { data: { sha: "saved-commit" } };
  });
});

it("previews the existing article at the repository's default branch", async () => {
  const result = await GET(new Request("http://localhost/api/github/save?path=" + encodeURIComponent(path)));
  expect(await result.json()).toEqual({ ...expected, content: "# 기존 내용" });
});

it.each([["original", "edited"], [null, "created"], ["original", null]])(
  "rejects a file changed from %s to %s between preview and publish",
  async (previous, current) => {
    targetSha = current;
    expect((await post(previous)).status).toBe(409);
    expect(github.mock.calls.filter(([route]) => /^(POST|PATCH)/.test(route))).toHaveLength(0);
  },
);

it("rejects a branch advance after planning before writing blobs", async () => {
  advanceAtRead = 2;
  expect((await post("original")).status).toBe(409);
  expect(github.mock.calls.filter(([route]) => /^(POST|PATCH)/.test(route))).toHaveLength(0);
});

it("returns the draft PR on a confirmed edit and builds indexes on a pinned revision", async () => {
  const result = await post("original", "review");
  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({ mode: "review", pullRequestUrl: "https://github.com/DawnteaStudio/TIL/pull/9" });
  expect(github).toHaveBeenCalledWith("GET /repos/{owner}/{repo}/contents/{path}", expect.objectContaining({ path, ref: "head" }));
});

it("protects a folder created at the expected new file path", async () => {
  targetSha = null;
  extraPaths = [path + "/keep.md"];
  expect((await post(null)).status).toBe(409);
  expect(github.mock.calls.filter(([route]) => /^(POST|PATCH)/.test(route))).toHaveLength(0);
});

it("checks the review base again after building the commit", async () => {
  advanceAtRead = 3;
  expect((await post("original", "review")).status).toBe(409);
  expect(github.mock.calls.some(([route]) => route === "POST /repos/{owner}/{repo}/git/refs")).toBe(false);
});

it("opens a concurrently created canonical source instead of saving a first note under another folder", async () => {
  const notePath = "languages/java/notes/java-basic/note/ch1.md";
  targetSha = null;
  extraPaths = ["languages/java/notes/Java-Basic/src/ch1/A.java"];
  const result = await POST(new Request("http://localhost/api/github/save", {
    method: "POST", body: JSON.stringify({
      expected: { ...expected, path: notePath, sha: null }, mode: "quick", message: "First note",
      sourceMetadata: { name: "Java Basic", type: "book" }, changes: [{ path: notePath, content: "# 첫 글" }],
    }),
  }));
  expect(result.status).toBe(409);
  expect(await result.json()).toMatchObject({ error: "source_exists", sourceName: "Java-Basic", sourcePaths: extraPaths });
  expect(github.mock.calls.filter(([route]) => /^(POST|PATCH)/.test(route))).toHaveLength(0);
});
