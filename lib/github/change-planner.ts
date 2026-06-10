import {
  ancestorReadmePath,
  upsertAncestorReadme,
} from "@/lib/content/ancestor-readme";
import {
  parseSourceNote,
  sourcePathForNote,
  upsertSourceReadme,
  type SourceMetadata,
} from "@/lib/content/source-readme";
import {
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
    const hasRemainingSourceContent = resultingPaths.some((path) =>
      path.startsWith(`${sourcePath}/`),
    );
    if (!hasRemainingSourceContent) continue;

    const readmePath = `${sourcePath}/README.md`;
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
      existingContent: await readCurrentDocument(readmePath),
      notes,
      srcSlugs,
    });

    appendGenerated(readmePath, content);
  }

  const topicReadmePaths = affectedTopicReadmePaths(input.requestedChanges);
  for (const readmePath of topicReadmePaths) {
    const content = upsertTopicReadmeIndex({
      topicPath: topicPathForReadme(readmePath),
      existingContent: await readCurrentDocument(readmePath),
      documentPaths: resultingPaths,
    });
    appendGenerated(readmePath, content);
  }

  const ancestorDirectories = affectedAncestorDirectories(topicReadmePaths);
  for (const directoryPath of ancestorDirectories) {
    const readmePath = ancestorReadmePath(directoryPath);
    const content = upsertAncestorReadme({
      directoryPath,
      existingContent: await readCurrentDocument(readmePath),
      repositoryPaths: resultingPaths,
    });
    appendGenerated(readmePath, content);
  }

  return collapseChanges([...input.requestedChanges, ...generatedChanges]);

  function appendGenerated(path: string, content: string) {
    generatedContent.set(path, content);
    generatedChanges.push({ operation: "upsert", path, content });
    resultingPaths = applyPathOperations(resultingPaths, [
      { operation: "upsert", path, content },
    ]);
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

function affectedTopicReadmePaths(changes: RepositoryChange[]): string[] {
  return [
    ...new Set(
      changes
        .map((change) => readmePathForContentPath(change.path))
        .filter((path): path is string => Boolean(path)),
    ),
  ].sort((left, right) => left.localeCompare(right));
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
