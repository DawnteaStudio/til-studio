import type { ContentArea } from "./types";

export interface StudyTarget {
  area: Exclude<ContentArea, "coding-test">;
  topic: string;
}

export function deriveStudyTarget(path: string): StudyTarget | null {
  const [area, topic] = path.split("/").filter(Boolean);

  if (!area || !topic) return null;
  if (area === "coding-test") return null;
  if (area !== "cs" && area !== "languages" && area !== "projects") return null;

  return { area, topic };
}
