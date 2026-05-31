import type { AppDataAdapter, ContentIndexState } from "./adapter";

let contentIndex: ContentIndexState | null = null;

export const memoryDataAdapter: AppDataAdapter = {
  async getContentIndex() {
    return contentIndex;
  },
  async setContentIndex(index) {
    contentIndex = index;
  },
};
