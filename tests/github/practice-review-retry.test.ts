import { beforeEach, expect, it, vi } from "vitest";
import { saveToGitHub } from "@/lib/github/save";
import { PublishConflict } from "@/lib/github/publish";
const github = vi.hoisted(() => vi.fn());
vi.mock("@/lib/github/client", () => ({ createInstallationOctokit: async () => ({ request: github }) }));
const input = {
  repository: {owner:"example", repo:"til", defaultBranch:"main"}, plannedHeadSha:"base",
  mode:"review" as const, reviewKey:"deadbeef", message:"Link practice", changes:[],
};
const pr = {html_url:"https://github.com/example/til/pull/2", head:{sha:"existing"}};
let pulls: typeof pr[];
let existingTree: string;
let refAlreadyExists: boolean;
let concurrentPull: boolean;
const exists = () => Object.assign(new Error("Already exists"), {status:422});
beforeEach(() => {
  pulls = []; existingTree = "newtree"; refAlreadyExists = false; concurrentPull = false;
  github.mockReset().mockImplementation(async (route: string, params: Record<string, string>) => {
    if (route === "GET /repos/{owner}/{repo}/pulls") return {data:pulls};
    if (route.endsWith("/git/ref/{ref}")) return {data:{object:{sha:params.ref === "heads/main" ? "base" : "existing"}}};
    if (route.endsWith("/git/commits/{commit_sha}")) {
      return {data:{tree:{sha:params.commit_sha === "base" ? "tree" : existingTree}, parents:[{sha:"base"}]}};
    }
    if (route.endsWith("/git/trees/{tree_sha}")) return {data:{tree:[]}};
    if (route.endsWith("/git/trees")) return {data:{sha:"newtree"}};
    if (route.endsWith("/git/commits")) return {data:{sha:"newcommit"}};
    if (route.endsWith("/git/refs") && refAlreadyExists) throw exists();
    if (route === "POST /repos/{owner}/{repo}/pulls") {
      pulls = [pr];
      if (concurrentPull) throw exists();
      return {data:pr};
    }
    return {data:{}};
  });
});
it("reuses the same open draft PR after a successful request's response was lost", async () => {
  await saveToGitHub(input);
  github.mockClear();
  expect(await saveToGitHub(input)).toMatchObject({pullRequestUrl:pr.html_url, commitSha:"existing"});
  expect(github.mock.calls.some(([route]) => /^(?:POST|PATCH)/.test(route))).toBe(false);
});
it("resumes after ref creation or a concurrent PR creation without overwriting a branch", async () => {
  refAlreadyExists = true; concurrentPull = true;
  expect(await saveToGitHub(input)).toMatchObject({pullRequestUrl:pr.html_url,commitSha:"existing"});
  expect(github.mock.calls.some(([route]) => route.startsWith("PATCH"))).toBe(false);
});
it("rejects a branch whose contents differ from the planned changes", async () => {
  refAlreadyExists = true; existingTree = "different";
  await expect(saveToGitHub(input)).rejects.toBeInstanceOf(PublishConflict);
  expect(github.mock.calls.some(([route]) => route === "POST /repos/{owner}/{repo}/pulls")).toBe(false);
});
