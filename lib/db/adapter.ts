import type { ContentNode, IndexedDocument } from "@/lib/content/types";

export interface ContentIndexState {
  syncedAt: string;
  tree: ContentNode;
  documents: IndexedDocument[];
}

export interface AppDataAdapter {
  getContentIndex(): Promise<ContentIndexState | null>;
  setContentIndex(index: ContentIndexState): Promise<void>;
}
