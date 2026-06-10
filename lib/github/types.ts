import type { SaveMode } from "@/lib/content/types";

export interface RepositoryRef {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface FileChange {
  operation?: "upsert";
  path: string;
  content: string;
}

export type RepositoryChange =
  | {
      operation: "upsert";
      path: string;
      content: string;
    }
  | {
      operation: "delete";
      path: string;
    };

export interface SaveRequest {
  repository: RepositoryRef;
  mode: SaveMode;
  message: string;
  changes: RepositoryChange[];
}

export interface SaveResult {
  mode: SaveMode;
  branch: string;
  commitSha?: string;
  pullRequestUrl?: string;
}
