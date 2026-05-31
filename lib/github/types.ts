import type { SaveMode } from "@/lib/content/types";

export interface RepositoryRef {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface FileChange {
  path: string;
  content: string;
}

export interface SaveRequest {
  repository: RepositoryRef;
  mode: SaveMode;
  message: string;
  changes: FileChange[];
}

export interface SaveResult {
  mode: SaveMode;
  branch: string;
  commitSha?: string;
  pullRequestUrl?: string;
}
