import {
  ancestorReadmePath,
  isRemovableAncestorReadme,
  upsertAncestorReadme,
} from "@/lib/content/ancestor-readme";
import {
  isRemovableSourceReadme,
  parseSourceNote,
  sourcePathForNote,
  upsertSourceReadme,
  type SourceMetadata,
} from "@/lib/content/source-readme";
import {
  isRemovableTopicReadme,
  readmePathForContentPath,
  topicPathForReadme,
  upsertTopicReadmeIndex,
} from "@/lib/content/topic-readme";
import type { RepositoryChange } from "./types";

export function applyPathOperations(
  existingPaths: string[],
  changes: RepositoryChange[],
): string[] {
  const paths = new Set(existingPaths);

  for (const change of changes) {
    if (change.operation === "delete") paths.delete(change.path);
    else paths.add(change.path);
  }

  return [...paths].sort();
}

export async function planRepositoryChanges(input: {
  existingPaths: string[];
  requestedChanges: RepositoryChange[];
  readDocument(path: string): Promise<string | null>;
  sourceMetadata?: SourceMetadata;
}): Promise<RepositoryChange[]> {
  const requestedContent = new Map(
    input.requestedChanges
      .filter(
        (
          change,
        ): change is Extract<RepositoryChange, { operation: "upsert" }> =>
          change.operation === "upsert",
      )
      .map((change) => [change.path, change.content]),
  );
  const generatedContent = new Map<string, string>();
  let resultingPaths = applyPathOperations(
    input.existingPaths,
    input.requestedChanges,
  );
  const generatedChanges: RepositoryChange[] = [];

  const readCurrentDocument = async (path: string): Promise<string | null> => {
    if (generatedContent.has(path)) return generatedContent.get(path) ?? null;
    if (requestedContent.has(path)) return requestedContent.get(path) ?? null;
    return input.readDocument(path);
  };

  const sourcePaths = affectedSourcePaths(input.requestedChanges);
  for (const sourcePath of sourcePaths) {
    const readmePath = `${sourcePath}/README.md`;
    const hasRemainingSourceContent = resultingPaths.some(
      (path) =>
        path.startsWith(`${sourcePath}/note/`) ||
        path.startsWith(`${sourcePath}/src/`),
    );
    const existingReadme = await readCurrentDocument(readmePath);
    if (!hasRemainingSourceContent) {
      if (!existingReadme) continue;
      if (
        isRemovableSourceReadme({
          sourcePath,
          content: existingReadme,
        })
      ) {
        appendGenerated({ operation: "delete", path: readmePath });
        continue;
      }
    }

    const notePaths = resultingPaths.filter(
      (path) =>
        path.startsWith(`${sourcePath}/note/`) && path.endsWith(".md"),
    );
    const notes = (
      await Promise.all(
        notePaths.map(async (path) => {
          const content = await readCurrentDocument(path);
          return content ? parseSourceNote({ path, content }) : null;
        }),
      )
    ).filter((note): note is NonNullable<typeof note> => Boolean(note));
    const srcSlugs = [
      ...new Set(
        resultingPaths
          .filter((path) => path.startsWith(`${sourcePath}/src/`))
          .map((path) =>
            path.slice(`${sourcePath}/src/`.length).split("/")[0],
          )
          .filter(Boolean),
      ),
    ];
    const sourceSlug = sourcePath.split("/").at(-1) ?? "source";
    const content = upsertSourceReadme({
      sourcePath,
      metadata: input.sourceMetadata ?? {
        name: sourceSlug,
        type: "etc",
      },
      existingContent: existingReadme,
      notes,
      srcSlugs,
    });

    appendGenerated({ operation: "upsert", path: readmePath, content });
  }

  const topicReadmePaths = affectedTopicReadmePaths(
    input.requestedChanges,
    input.existingPaths,
    resultingPaths,
  );
  const structurallyChangedTopicReadmes: string[] = [];
  for (const readmePath of topicReadmePaths) {
    const existedBefore = input.existingPaths.includes(readmePath);
    const topicPath = topicPathForReadme(readmePath);
    const existingReadme = await readCurrentDocument(readmePath);
    const hasRemainingTopicContent = resultingPaths.some(
      (path) =>
        path.startsWith(`${topicPath}/notes/`) ||
        path.startsWith(`${topicPath}/theory/`),
    );
    if (
      !hasRemainingTopicContent &&
      existingReadme &&
      isRemovableTopicReadme({
        topicPath,
        content: existingReadme,
      })
    ) {
      appendGenerated({ operation: "delete", path: readmePath });
      if (existedBefore) structurallyChangedTopicReadmes.push(readmePath);
      continue;
    }

    const content = upsertTopicReadmeIndex({
      topicPath,
      existingContent: existingReadme,
      documentPaths: resultingPaths,
    });
    appendGenerated({ operation: "upsert", path: readmePath, content });
    if (!existedBefore) structurallyChangedTopicReadmes.push(readmePath);
  }

  const ancestorDirectories = affectedAncestorDirectories(
    structurallyChangedTopicReadmes,
  );
  for (const directoryPath of ancestorDirectories) {
    const readmePath = ancestorReadmePath(directoryPath);
    const existingReadme = await readCurrentDocument(readmePath);
    const hasRemainingChildren = resultingPaths.some((path) => {
      if (path === readmePath) return false;
      const prefix = directoryPath ? `${directoryPath}/` : "";
      return path.startsWith(prefix);
    });
    if (
      directoryPath &&
      !hasRemainingChildren &&
      existingReadme &&
      isRemovableAncestorReadme({
        directoryPath,
        content: existingReadme,
      })
    ) {
      appendGenerated({ operation: "delete", path: readmePath });
      continue;
    }

    const content = upsertAncestorReadme({
      directoryPath,
      existingContent: existingReadme,
      repositoryPaths: resultingPaths,
    });
    appendGenerated({ operation: "upsert", path: readmePath, content });
  }

  return collapseChanges([...input.requestedChanges, ...generatedChanges]);

  function appendGenerated(change: RepositoryChange) {
    if (change.operation === "upsert") {
      generatedContent.set(change.path, change.content);
    } else {
      generatedContent.delete(change.path);
    }
    generatedChanges.push(change);
    resultingPaths = applyPathOperations(resultingPaths, [change]);
  }
}

function affectedSourcePaths(changes: RepositoryChange[]): string[] {
  return [
    ...new Set(
      changes
        .map((change) => sourcePathForNote(change.path))
        .filter((path): path is string => Boolean(path)),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function affectedTopicReadmePaths(
  changes: RepositoryChange[],
  existingPaths: string[],
  resultingPaths: string[],
): string[] {
  const readmePaths = new Set<string>();

  for (const change of changes) {
    const readmePath = readmePathForContentPath(change.path);
    if (!readmePath) continue;

    if (change.path.includes("/theory/")) {
      readmePaths.add(readmePath);
      continue;
    }

    const sourcePath = sourcePathForNote(change.path);
    if (
      sourcePath &&
      hasSourceContent(existingPaths, sourcePath) !==
        hasSourceContent(resultingPaths, sourcePath)
    ) {
      readmePaths.add(readmePath);
    }
  }

  return [...readmePaths].sort((left, right) =>
    left.localeCompare(right),
  );
}

function affectedAncestorDirectories(topicReadmePaths: string[]): string[] {
  const directories = new Set<string>();

  for (const readmePath of topicReadmePaths) {
    const topicPath = topicPathForReadme(readmePath);
    const segments = topicPath.split("/").filter(Boolean);
    for (let depth = segments.length - 1; depth >= 1; depth -= 1) {
      directories.add(segments.slice(0, depth).join("/"));
    }
    directories.add("");
  }

  return [...directories].sort((left, right) => {
    const depthDifference = pathDepth(right) - pathDepth(left);
    return depthDifference || left.localeCompare(right);
  });
}

function collapseChanges(changes: RepositoryChange[]): RepositoryChange[] {
  const order: string[] = [];
  const byPath = new Map<string, RepositoryChange>();

  for (const change of changes) {
    if (!byPath.has(change.path)) order.push(change.path);
    byPath.set(change.path, change);
  }

  return order
    .map((path) => byPath.get(path))
    .filter((change): change is RepositoryChange => Boolean(change));
}

function pathDepth(path: string): number {
  return path ? path.split("/").length : 0;
}

function hasSourceContent(paths: string[], sourcePath: string): boolean {
  return paths.some(
    (path) =>
      path.startsWith(`${sourcePath}/note/`) ||
      path.startsWith(`${sourcePath}/src/`),
  );
}
