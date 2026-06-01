import { makeSlug } from "./paths";
import type { ContentNode, SaveMode } from "./types";

export type StudioDraftKind = "note" | "theory";

export interface StudioSourceOption {
  name: string;
  path: string;
}

export interface StudioTopicOption {
  name: string;
  path: string;
  sources: StudioSourceOption[];
}

export interface StudioAreaOption {
  name: string;
  path: string;
  topics: StudioTopicOption[];
}

export interface StudioWorkspaceModel {
  areas: StudioAreaOption[];
}

const publishableAreas = new Set(["cs", "languages", "projects"]);

export function defaultSaveModeForDraft(kind: StudioDraftKind): SaveMode {
  return kind === "theory" ? "review" : "quick";
}

export function buildStudioWorkspace(
  tree: ContentNode,
  visibleRootPaths: string[],
): StudioWorkspaceModel {
  const visibleRootSet = new Set(visibleRootPaths);

  return {
    areas: (tree.children ?? [])
      .filter((node) => node.type === "directory")
      .filter((node) => publishableAreas.has(node.path))
      .filter((node) => !visibleRootSet.size || visibleRootSet.has(node.path))
      .map(toAreaOption),
  };
}

export function topicPathFromSelection(input: {
  area: string;
  existingTopicPath: string;
  newTopicName: string;
}): string {
  if (input.newTopicName.trim()) {
    return `${input.area}/${makeSlug(input.newTopicName)}`;
  }

  return input.existingTopicPath;
}

function toAreaOption(node: ContentNode): StudioAreaOption {
  return {
    name: node.name,
    path: node.path,
    topics: (node.children ?? [])
      .filter((child) => child.type === "directory")
      .map(toTopicOption),
  };
}

function toTopicOption(node: ContentNode): StudioTopicOption {
  const notes = (node.children ?? []).find((child) => child.type === "directory" && child.name === "notes");

  return {
    name: node.name,
    path: node.path,
    sources: (notes?.children ?? [])
      .filter((child) => child.type === "directory")
      .map((child) => ({ name: child.name, path: child.path })),
  };
}
