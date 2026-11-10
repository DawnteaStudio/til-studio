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

import { PublishConflict } from "@/lib/github/publish";
import { POST } from "@/app/api/github/source/route";

describe("source workspace route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchSnapshot.mockResolvedValue({
      owner: "example",
      repo: "repo",
      branch: "main",
      headSha: "pinned",
      allPaths: ["README.md", "languages/README.md"],
      paths: ["README.md", "languages/README.md"],
      tree: {},
    });
    mocks.fetchDocument.mockResolvedValue(null);
    mocks.planChanges.mockImplementation(async ({ requestedChanges }) => [
      ...requestedChanges,
      {
        operation: "upsert",
        path: "languages/java/README.md",
        content: "# Java",
      },
    ]);
    mocks.save.mockResolvedValue({ mode: "quick", commitSha: "abc123" });
  });

  it("plans and publishes a source workspace without a note", async () => {
    const response = await POST(
      request({
        mode: "quick",
        topicPath: "languages/java",
        sourceName: "Java Basic",
        sourceMetadata: {
          name: "Java Basic",
          type: "book",
          technologies: ["Java"],
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.planChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        existingPaths: ["README.md", "languages/README.md"],
        requestedChanges: [
          expect.objectContaining({
            operation: "upsert",
            path: "languages/java/notes/java-basic/README.md",
          }),
          {
            operation: "upsert",
            path: "languages/java/notes/java-basic/note/.gitkeep",
            content: "",
          },
          {
            operation: "upsert",
            path: "languages/java/notes/java-basic/src/.gitkeep",
            content: "",
          },
        ],
        sourceMetadata: {
          name: "Java Basic",
          type: "book",
          technologies: ["Java"],
        },
      }),
    );
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "quick",
        message: "Create TIL source workspace from til-studio",
        plannedHeadSha: "pinned",
      }),
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ commitSha: "abc123" }),
    );
  });

  const create = () => POST(request({
    mode: "quick", topicPath: "languages/java", sourceName: "Java Basic",
    sourceMetadata: { name: "Java Basic", type: "book" },
  }));
  const existingPath = "languages/java/notes/Java-Basic/src/ch1/Main.java";

  it("opens the exact existing folder even if it contains only code, without planning any writes", async () => {
    mocks.fetchSnapshot.mockResolvedValueOnce({ allPaths: [existingPath] });
    const response = await create();
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "source_exists", sourceName: "Java-Basic", sourcePaths: [existingPath] });
    expect(mocks.planChanges).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("reports the existing folder if another writer creates it after the plan", async () => {
    const before = { owner: "example", repo: "repo", branch: "main", headSha: "old", allPaths: [] };
    mocks.fetchSnapshot.mockResolvedValueOnce(before)
      .mockResolvedValueOnce({ ...before, headSha: "new", allPaths: [existingPath] });
    mocks.save.mockRejectedValueOnce(new PublishConflict());
    const response = await create();
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ plannedHeadSha: "old" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ sourceName: "Java-Basic" });
  });

  it.each(["../languages/java", "languages/../java", "languages/java/"])(
    "rejects an unsafe topic path: %s",
    async (topicPath) => {
      const response = await POST(
        request({
          mode: "quick",
          topicPath,
          sourceName: "Java Basic",
          sourceMetadata: { name: "Java Basic", type: "book" },
        }),
      );

      expect(response.status).toBe(400);
      expect(mocks.save).not.toHaveBeenCalled();
    },
  );
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/github/source", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
