import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/github/practice-link/route";
import { PublishConflict } from "@/lib/github/publish";
import { readPracticeLinks } from "@/lib/content/practice-links";

const { snapshot, read, save } = vi.hoisted(() => ({ snapshot: vi.fn(), read: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/github/repository", () => ({ fetchRepositoryMarkdownSnapshot: snapshot }));
vi.mock("@/lib/github/publish", async original => ({
  ...await original<typeof import("@/lib/github/publish")>(), snapshotFileReader: () => read,
}));
vi.mock("@/lib/github/save", async original => ({
  ...await original<typeof import("@/lib/github/save")>(), saveToGitHub: save,
}));

const source = "languages/java/notes/Java course";
const path = source + "/note/ch1.md";
const practice = "한글 Lab [2], #C++";
const expected = { owner: "owner", repo:"TIL", branch:"trunk", path, sha:"original" };
const files = [path, source + "/src/ch1/Main.java", source + "/src/" + practice + "/src/Demo.java"];
const repo = { ...expected, allPaths: files, headSha: "pinned" };
let note: string;
function post(overrides: Record<string, unknown> = {}) {
  return POST(new Request("http://localhost/api/github/practice-link", { method:"POST",
    body: JSON.stringify({path, practice, mode:"quick", expected, ...overrides}) }));
}
beforeEach(() => {
  vi.resetAllMocks();
  note = "---\r\ncreated: 2026-11-10\r\nsrc: reserved\r\n---\r\n\r\n# Chapter 1\r\n";
  snapshot.mockResolvedValue(repo);
  read.mockImplementation(async key => key === path ? {content:note,sha:"original"} : null);
  save.mockImplementation(async req => ({mode:req.mode,branch:req.mode === "quick" ? "trunk" : "review-branch",commitSha:"saved"}));
});
it.each(["quick","review"])("publishes a %s mode metadata change together with the generated source table", async mode => {
  const response = await post({mode});
  expect(response.status).toBe(200);
  const request = save.mock.calls[0][0];
  expect(request).toMatchObject({mode,plannedHeadSha:"pinned",repository:{owner:"owner",repo:"TIL",defaultBranch:"trunk"}});
  const updated = request.changes.find((c: {path:string}) => c.path === path);
  expect(readPracticeLinks(updated.content)).toEqual(["reserved","ch1",practice]);
  expect(updated.content.split("---\r\n").at(-1)).toBe(note.split("---\r\n").at(-1));
  expect(request.changes.find((c: {path:string}) => c.path === source + "/README.md").content).toContain(encodeURIComponent(practice));
});
it("returns success without touching GitHub when an implicit link already exists or a Quick response was lost", async () => {
  expect(await (await post({practice:"ch1"})).json()).toMatchObject({alreadyLinked:true});
  note = "---\nsrc:\n  - \"한글 Lab [2], #C++\"\n---\n# Done";
  expect(await (await post({expected:{...expected,sha:"before-retry"}})).json()).toMatchObject({alreadyLinked:true});
  expect(save).not.toHaveBeenCalled();
});
it.each([{expected:{...expected,sha:"stale"}},{expected:{...expected,repo:"other"}},{expected:{...expected,branch:"main"}},{practice:"deleted"}])("rejects changed expected state %j", async patch => {
  expect((await post(patch)).status).toBe(409);
  expect(save).not.toHaveBeenCalled();
});
it.each([{practice:"../x"},{expected:null},{expected:{...expected,sha:null}},{path:"languages/java/theory/ch1.md"},{expected:{...expected,path:path+"x"}}])("rejects unsafe, incomplete or mismatched requests %j", async patch => {
  expect((await post(patch)).status).toBe(400);
  expect(save).not.toHaveBeenCalled();
});
it("requires a code file in the exact source and refuses placeholder-only or missing notes", async () => {
  snapshot.mockResolvedValue({...repo,allPaths:[path,source + "/src/"+practice+"/.gitkeep","languages/java/notes/Other/src/"+practice+"/x.java"]});
  expect((await post()).status).toBe(409);
  snapshot.mockResolvedValue(repo);
  read.mockResolvedValue(null);
  expect((await post()).status).toBe(409);
  expect(save).not.toHaveBeenCalled();
});
it("protects unsupported YAML, broken managed blocks, concurrent publications and service errors", async () => {
  note = "---\nsrc: [broken\n---\n# Chapter";
  expect((await post()).status).toBe(422);
  note = "# Chapter";
  read.mockImplementation(async key => key === path ? {content:note,sha:"original"} :
    key === source + "/README.md" ? {content:"<!-- til-studio:learning-log:start -->",sha:"broken"} : null);
  expect((await post()).status).toBe(422);
  read.mockImplementation(async key => key === path ? {content:note,sha:"original"} : null);
  save.mockRejectedValueOnce(new PublishConflict()).mockRejectedValueOnce(new Error("GitHub failed"));
  expect((await post()).status).toBe(409);
  expect((await post()).status).toBe(502);
});
