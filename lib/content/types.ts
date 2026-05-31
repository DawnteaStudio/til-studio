export type ContentArea = "cs" | "languages" | "projects" | "coding-test";

export type ContentKind = "note" | "theory" | "readme" | "other";

export type SaveMode = "quick" | "review";

export interface NotePathInput {
  area: Exclude<ContentArea, "coding-test">;
  topic: string;
  source: string;
  title: string;
}

export interface TheoryPathInput {
  area: Exclude<ContentArea, "coding-test">;
  topic: string;
  title: string;
}

export interface ContentNode {
  name: string;
  path: string;
  type: "directory" | "file";
  kind: ContentKind;
  children?: ContentNode[];
}

export interface IndexedDocument {
  path: string;
  title: string;
  kind: ContentKind;
  headings: string[];
  body: string;
  keywords: string[];
}
