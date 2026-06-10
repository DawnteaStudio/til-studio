import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSourceReadmeChanges,
  buildTopicReadmeChanges,
  recommendSaveMode,
  saveToGitHub,
} from "@/lib/github/save";

const requestMock = vi.fn();

vi.mock("@/lib/github/client", () => ({
  createInstallationOctokit: vi.fn(async () => ({
    request: requestMock,
  })),
}));

beforeEach(() => {
  requestMock.mockReset();
});

describe("save mode recommendation", () => {
  it("quick-saves ordinary notes", () => {
    expect(recommendSaveMode(["cs/network/notes/book-network/network-layer.md"])).toBe("quick");
  });

  it("review-saves theory files", () => {
    expect(recommendSaveMode(["cs/network/theory/network-layer.md"])).toBe("review");
  });

  it("review-saves readme and structural changes", () => {
    expect(recommendSaveMode(["cs/network/README.md"])).toBe("review");
    expect(recommendSaveMode(["cs/network/notes/book-network/.keep"])).toBe("review");
  });

  it("adds topic README updates for note and theory changes", () => {
    const changes = buildTopicReadmeChanges({
      existingPaths: ["cs/network/notes/book-network/note/network-layer.md"],
      incomingChanges: [
        {
          path: "cs/network/notes/etc/note/tcp.md",
          content: "# TCP",
        },
        {
          path: "cs/network/theory/udp.md",
          content: "# UDP",
        },
      ],
      existingReadmes: {
        "cs/network/README.md": "# Network\n\nIntro",
      },
    });

    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe("cs/network/README.md");
    expect(changes[0].content).toContain("- [book-network](notes/book-network/)");
    expect(changes[0].content).toContain("- [etc](notes/etc/)");
    expect(changes[0].content).not.toContain("notes/etc/note/tcp.md");
    expect(changes[0].content).toContain("- [udp](theory/udp.md)");
  });

  it("adds a source README update for an incoming note", () => {
    const changes = buildSourceReadmeChanges({
      existingPaths: ["languages/c/notes/hongongc/src/array-pointer/main.c"],
      incomingChanges: [
        {
          path: "languages/c/notes/hongongc/note/array-pointer.md",
          content: "---\ncreated: 2026-06-10\n---\n\n# 배열과 포인터\n",
        },
      ],
      existingReadmes: {},
      noteContents: {},
      sourceMetadata: {
        name: "혼자 공부하는 C",
        type: "book",
        overview: "C 문법과 실습",
        technologies: ["C"],
        references: ["https://example.com/book"],
      },
    });

    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe("languages/c/notes/hongongc/README.md");
    expect(changes[0].content).toContain(
      "| 2026-06-10 | 배열과 포인터 | [src](./src/array-pointer/) | [note](./note/array-pointer.md) |",
    );
  });
});

describe("GitHub change publication", () => {
  it("publishes upserts and deletions to the selected branch", async () => {
    requestMock.mockImplementation(async (route: string, parameters: Record<string, unknown>) => {
      if (route === "GET /repos/{owner}/{repo}/git/ref/{ref}") {
        return { data: { object: { sha: "base-sha" } } };
      }
      if (route === "POST /repos/{owner}/{repo}/git/refs") {
        return { data: {} };
      }
      if (route === "GET /repos/{owner}/{repo}/contents/{path}") {
        return {
          data: {
            type: "file",
            sha: parameters.path === "languages/java/README.md" ? "readme-sha" : "note-sha",
          },
        };
      }
      if (route === "PUT /repos/{owner}/{repo}/contents/{path}") {
        return { data: { commit: { sha: "upsert-commit" } } };
      }
      if (route === "DELETE /repos/{owner}/{repo}/contents/{path}") {
        return { data: { commit: { sha: "delete-commit" } } };
      }
      if (route === "POST /repos/{owner}/{repo}/pulls") {
        return { data: { html_url: "https://github.com/example/repo/pull/1" } };
      }
      throw new Error(`Unexpected route: ${route}`);
    });

    const result = await saveToGitHub({
      repository: {
        owner: "example",
        repo: "repo",
        defaultBranch: "main",
      },
      mode: "review",
      message: "Update TIL",
      changes: [
        {
          operation: "upsert",
          path: "languages/java/README.md",
          content: "# Java",
        },
        {
          operation: "delete",
          path: "languages/java/notes/java-intro/note/test.md",
        },
      ],
    });

    expect(requestMock).toHaveBeenCalledWith(
      "PUT /repos/{owner}/{repo}/contents/{path}",
      expect.objectContaining({
        branch: expect.stringMatching(/^til-studio\//),
        path: "languages/java/README.md",
        sha: "readme-sha",
      }),
    );
    expect(requestMock).toHaveBeenCalledWith(
      "DELETE /repos/{owner}/{repo}/contents/{path}",
      expect.objectContaining({
        branch: expect.stringMatching(/^til-studio\//),
        path: "languages/java/notes/java-intro/note/test.md",
        sha: "note-sha",
      }),
    );
    expect(result.pullRequestUrl).toBe("https://github.com/example/repo/pull/1");
  });

  it("rejects deletion when the target file no longer exists", async () => {
    requestMock.mockImplementation(async (route: string) => {
      if (route === "GET /repos/{owner}/{repo}/git/ref/{ref}") {
        return { data: { object: { sha: "base-sha" } } };
      }
      if (route === "GET /repos/{owner}/{repo}/contents/{path}") {
        throw new Error("Not found");
      }
      throw new Error(`Unexpected route: ${route}`);
    });

    await expect(
      saveToGitHub({
        repository: {
          owner: "example",
          repo: "repo",
          defaultBranch: "main",
        },
        mode: "quick",
        message: "Delete TIL note",
        changes: [
          {
            operation: "delete",
            path: "languages/java/notes/java-intro/note/test.md",
          },
        ],
      }),
    ).rejects.toThrow("GitHub deletion target does not exist");
  });
});
