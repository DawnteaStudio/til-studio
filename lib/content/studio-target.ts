import type { ContentArea } from "./types";

export interface StudyTarget {
  area: Exclude<ContentArea, "coding-test">;
  topic: string;
}

export function deriveStudyTarget(path: string): StudyTarget | null {
  const [area, topic] = path.split("/").filter(Boolean);

  if (!area || !topic) return null;
  if (area !== "cs" && area !== "languages" && area !== "projects" && area !== "software-engineering") return null;

  return { area, topic };
}
