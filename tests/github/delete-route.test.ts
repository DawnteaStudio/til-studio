import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchSnapshot: vi.fn(),
  fetchDocument: vi.fn(),
  planChanges: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@/lib/github/repository", () => ({
  fetchRepositoryMarkdownSnapshot: mocks.fetchSnapshot,
  fetchRepositoryMarkdownDocument: mocks.fetchDocument,
}));

vi.mock("@/lib/github/change-planner", () => ({
  planRepositoryChanges: mocks.planChanges,
}));

vi.mock("@/lib/github/save", () => ({
  saveToGitHub: mocks.save,
}));

vi.mock("@/lib/settings/runtime-settings", () => ({
  getRuntimeSetting: vi.fn((key: string) => {
    if (key === "TIL_REPOSITORY_OWNER") return "example";
    if (key === "TIL_REPOSITORY_NAME") return "repo";
    return undefined;
  }),
}));

import { POST } from "@/app/api/github/delete/route";

describe("note deletion route", () => {
  const notePath = "languages/java/notes/java-intro/note/test.md";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchSnapshot.mockResolvedValue({
      owner: "example",
      repo: "repo",
      branch: "main",
      allPaths: ["README.md", notePath],
      paths: ["README.md", notePath],
      tree: {},
    });
    mocks.fetchDocument.mockResolvedValue(null);
    mocks.planChanges.mockResolvedValue([
      { operation: "delete", path: notePath },
      {
        operation: "upsert",
        path: "languages/java/README.md",
        content: "# Java",
      },
    ]);
    mocks.save.mockResolvedValue({
      mode: "review",
      branch: "til-studio/delete",
      pullRequestUrl: "https://github.com/example/repo/pull/1",
    });
  });

  it("plans and publishes a valid note deletion", async () => {
    const response = await POST(
      request({
        mode: "review",
        path: notePath,
        message: "Delete TIL note from til-studio",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.planChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        existingPaths: ["README.md", notePath],
        requestedChanges: [{ operation: "delete", path: notePath }],
      }),
    );
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "review",
        changes: expect.arrayContaining([
          { operation: "delete", path: notePath },
        ]),
      }),
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        pullRequestUrl: "https://github.com/example/repo/pull/1",
      }),
    );
  });

  it.each([
    "languages/java/theory/test.md",
    "languages/java/README.md",
    "languages/java/notes/java-intro/note/../README.md",
    "../languages/java/notes/java-intro/note/test.md",
  ])("rejects an unsafe deletion path: %s", async (path) => {
    const response = await POST(
      request({
        mode: "quick",
        path,
        message: "Delete TIL note",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.planChanges).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("returns not found when the note is absent from the snapshot", async () => {
    mocks.fetchSnapshot.mockResolvedValue({
      owner: "example",
      repo: "repo",
      branch: "main",
      allPaths: ["README.md"],
      paths: ["README.md"],
      tree: {},
    });

    const response = await POST(
      request({
        mode: "quick",
        path: notePath,
        message: "Delete TIL note",
      }),
    );

    expect(response.status).toBe(404);
    expect(mocks.planChanges).not.toHaveBeenCalled();
  });
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/github/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
