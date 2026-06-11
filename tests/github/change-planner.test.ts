import { describe, expect, it } from "vitest";
import {
  applyPathOperations,
  planRepositoryChanges,
} from "@/lib/github/change-planner";
import { upsertAncestorReadme } from "@/lib/content/ancestor-readme";
import { upsertSourceReadme } from "@/lib/content/source-readme";
import { upsertTopicReadmeIndex } from "@/lib/content/topic-readme";
import type { RepositoryChange } from "@/lib/github/types";

describe("repository change planning", () => {
  it("applies upserts and deletions to the path set", () => {
    const changes: RepositoryChange[] = [
      {
        operation: "delete",
        path: "languages/c/notes/book/note/old.md",
      },
      {
        operation: "upsert",
        path: "languages/java/notes/course/note/new.md",
        content: "# New",
      },
    ];

    expect(
      applyPathOperations(
        [
          "README.md",
          "languages/c/notes/book/note/old.md",
          "languages/c/notes/book/src/ch1/main.c",
        ],
        changes,
      ),
    ).toEqual([
      "README.md",
      "languages/c/notes/book/src/ch1/main.c",
      "languages/java/notes/course/note/new.md",
    ]);
  });

  it("creates source, topic, area, and root README changes for a new topic", async () => {
    const documents: Record<string, string> = {
      "README.md": "# TIL\n\nRoot intro",
      "languages/README.md": "# Languages\n\nLanguage intro",
    };

    const changes = await planRepositoryChanges({
      existingPaths: ["README.md", "languages/README.md"],
      requestedChanges: [
        {
          operation: "upsert",
          path: "languages/java/notes/java-intro/note/test.md",
          content: "---\ncreated: 2026-06-10\n---\n\n# Test note\n",
        },
      ],
      readDocument: async (path) => documents[path] ?? null,
      sourceMetadata: {
        name: "Java Intro",
        type: "lecture",
        technologies: ["Java"],
      },
    });

    expect(changes.map((change) => change.path)).toEqual([
      "languages/java/notes/java-intro/note/test.md",
      "languages/java/notes/java-intro/README.md",
      "languages/java/README.md",
      "languages/README.md",
      "README.md",
    ]);

    expect(upsertContent(changes, "languages/java/notes/java-intro/README.md")).toContain(
      "| 2026-06-10 | Test note | - | [test.md](./note/test.md) |",
    );
    expect(upsertContent(changes, "languages/java/README.md")).toContain(
      "- [java-intro](notes/java-intro/)",
    );
    expect(upsertContent(changes, "languages/README.md")).toContain(
      "- [java](java/)",
    );
    expect(upsertContent(changes, "README.md")).toContain(
      "- [languages](languages/)",
    );
    expect(upsertContent(changes, "README.md")).toContain("Root intro");
  });

  it("keeps an src-only learning row after deleting a paired note", async () => {
    const notePath = "languages/c/notes/hongongc/note/ch2.md";
    const documents: Record<string, string> = {
      "README.md": "# TIL",
      "languages/README.md": "# Languages",
      "languages/c/README.md": "# C",
      "languages/c/notes/hongongc/README.md": "# 혼자 공부하는 C",
      [notePath]: "---\ncreated: 2023-07-30\n---\n\n# C 언어 입문\n",
    };

    const changes = await planRepositoryChanges({
      existingPaths: [
        "README.md",
        "languages/README.md",
        "languages/c/README.md",
        "languages/c/notes/hongongc/README.md",
        notePath,
        "languages/c/notes/hongongc/src/ch2/main.c",
      ],
      requestedChanges: [{ operation: "delete", path: notePath }],
      readDocument: async (path) => documents[path] ?? null,
    });

    const sourceReadme = upsertContent(
      changes,
      "languages/c/notes/hongongc/README.md",
    );
    expect(sourceReadme).toContain(
      "| - | ch2 | [ch2](./src/ch2/) | - |",
    );
    expect(sourceReadme).not.toContain("./note/ch2.md");
  });

  it("removes a source from indexes when all source paths are deleted", async () => {
    const sourceRoot = "languages/java/notes/java-intro";
    const changes = await planRepositoryChanges({
      existingPaths: [
        "README.md",
        "languages/README.md",
        "languages/java/README.md",
        `${sourceRoot}/README.md`,
        `${sourceRoot}/note/test.md`,
      ],
      requestedChanges: [
        { operation: "delete", path: `${sourceRoot}/note/test.md` },
        { operation: "delete", path: `${sourceRoot}/README.md` },
      ],
      readDocument: async (path) => {
        if (path === "README.md") return "# TIL";
        if (path === "languages/README.md") return "# Languages";
        if (path === "languages/java/README.md") {
          return [
            "# Java",
            "",
            "<!-- til-studio:index:start -->",
            "## Notes",
            "- [java-intro](notes/java-intro/)",
            "",
            "## Theory",
            "",
            "아직 등록된 theory가 없습니다.",
            "<!-- til-studio:index:end -->",
          ].join("\n");
        }
        return null;
      },
    });

    const topicReadme = upsertContent(changes, "languages/java/README.md");
    expect(topicReadme).not.toContain("java-intro");
    expect(topicReadme).toContain("아직 등록된 note가 없습니다.");
  });

  it("deletes a fully managed empty hierarchy after its final note is deleted", async () => {
    const areaPath = "action-chain";
    const topicPath = `${areaPath}/topic`;
    const sourcePath = `${topicPath}/notes/source`;
    const notePath = `${sourcePath}/note/note.md`;
    const existingPaths = [
      "README.md",
      `${areaPath}/README.md`,
      `${topicPath}/README.md`,
      `${sourcePath}/README.md`,
      notePath,
    ];
    const documents = managedHierarchyDocuments({
      areaPath,
      topicPath,
      sourcePath,
      notePath,
      existingPaths,
    });

    const changes = await planRepositoryChanges({
      existingPaths,
      requestedChanges: [{ operation: "delete", path: notePath }],
      readDocument: async (path) => documents[path] ?? null,
    });

    expect(deletePaths(changes)).toEqual([
      notePath,
      `${sourcePath}/README.md`,
      `${topicPath}/README.md`,
      `${areaPath}/README.md`,
    ]);
    expect(upsertContent(changes, "README.md")).not.toContain("action-chain");
  });

  it("preserves user-authored topic and area prose after the final note is deleted", async () => {
    const areaPath = "action-chain";
    const topicPath = `${areaPath}/topic`;
    const sourcePath = `${topicPath}/notes/source`;
    const notePath = `${sourcePath}/note/note.md`;
    const existingPaths = [
      "README.md",
      `${areaPath}/README.md`,
      `${topicPath}/README.md`,
      `${sourcePath}/README.md`,
      notePath,
    ];
    const documents = managedHierarchyDocuments({
      areaPath,
      topicPath,
      sourcePath,
      notePath,
      existingPaths,
    });
    documents[`${areaPath}/README.md`] =
      `${documents[`${areaPath}/README.md`].trimEnd()}\n\n사용자가 작성한 area 설명\n`;
    documents[`${topicPath}/README.md`] =
      `${documents[`${topicPath}/README.md`].trimEnd()}\n\n사용자가 작성한 topic 설명\n`;

    const changes = await planRepositoryChanges({
      existingPaths,
      requestedChanges: [{ operation: "delete", path: notePath }],
      readDocument: async (path) => documents[path] ?? null,
    });

    expect(deletePaths(changes)).toEqual([
      notePath,
      `${sourcePath}/README.md`,
    ]);
    expect(upsertContent(changes, `${topicPath}/README.md`)).toContain(
      "사용자가 작성한 topic 설명",
    );
    expect(upsertContent(changes, `${areaPath}/README.md`)).toContain(
      "사용자가 작성한 area 설명",
    );
    expect(upsertContent(changes, "README.md")).toContain("action-chain");
  });
});

function upsertContent(changes: RepositoryChange[], path: string): string {
  const change = changes.find(
    (candidate) =>
      candidate.operation === "upsert" && candidate.path === path,
  );
  if (!change || change.operation !== "upsert") {
    throw new Error(`Missing upsert: ${path}`);
  }
  return change.content;
}

function deletePaths(changes: RepositoryChange[]): string[] {
  return changes
    .filter(
      (change): change is Extract<RepositoryChange, { operation: "delete" }> =>
        change.operation === "delete",
    )
    .map((change) => change.path);
}

function managedHierarchyDocuments(input: {
  areaPath: string;
  topicPath: string;
  sourcePath: string;
  notePath: string;
  existingPaths: string[];
}): Record<string, string> {
  const noteContent = "---\ncreated: 2026-06-11\n---\n\n# Cascade note\n";
  return {
    "README.md": upsertAncestorReadme({
      directoryPath: "",
      existingContent: "# TIL",
      repositoryPaths: input.existingPaths,
    }),
    [`${input.areaPath}/README.md`]: upsertAncestorReadme({
      directoryPath: input.areaPath,
      repositoryPaths: input.existingPaths,
    }),
    [`${input.topicPath}/README.md`]: upsertTopicReadmeIndex({
      topicPath: input.topicPath,
      documentPaths: input.existingPaths,
    }),
    [`${input.sourcePath}/README.md`]: upsertSourceReadme({
      sourcePath: input.sourcePath,
      metadata: { name: "Source", type: "etc" },
      notes: [
        {
          path: input.notePath,
          slug: "note",
          created: "2026-06-11",
          title: "Cascade note",
        },
      ],
      srcSlugs: [],
    }),
    [input.notePath]: noteContent,
  };
}
