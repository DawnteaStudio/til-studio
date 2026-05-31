import type { IndexedDocument } from "./types";

export interface TheorySearchResult {
  path: string;
  title: string;
  score: number;
  matchedKeywords: string[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function searchTheory(
  documents: IndexedDocument[],
  queryKeywords: string[],
): TheorySearchResult[] {
  const query = queryKeywords.map(normalize).filter(Boolean);

  return documents
    .filter((document) => document.kind === "theory")
    .map((document) => {
      const searchable = [
        document.path,
        document.title,
        ...document.headings,
        ...document.keywords,
        document.body,
      ]
        .join(" ")
        .toLowerCase();

      const matchedKeywords = query.filter((keyword) => searchable.includes(keyword));

      return {
        path: document.path,
        title: document.title,
        score: matchedKeywords.length,
        matchedKeywords,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}
