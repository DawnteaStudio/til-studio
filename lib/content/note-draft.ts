export interface StructuredNoteDraft {
  title: string;
  created: string;
  source: string;
  learned: string;
  confused: string;
  questions: string;
  conclusion: string;
  experiments: string;
  parentHref: string;
}

const absentFieldValues = new Set(["없음", "없어요", "해당 없음", "n/a", "na", "-"]);

function hasDraftContent(body: string): boolean {
  const normalized = body.trim().toLowerCase();
  return normalized.length > 0 && !absentFieldValues.has(normalized);
}

export function draftToNoteMarkdown(draft: StructuredNoteDraft): string {
  const sectionEntries = [
    ["학습 출처", draft.source],
    ["오늘 배운 것", draft.learned],
    ["헷갈린 점", draft.confused],
    ["확인하고 싶은 것", draft.questions],
    ["현재 이해한 결론", draft.conclusion],
    ["메모와 실험", draft.experiments],
  ].filter(([, body]) => hasDraftContent(body));
  const sections = sectionEntries
    .map(([heading, body]) => `## ${heading}\n${body.trim()}`)
    .join("\n\n");

  const toc = sectionEntries
    .map(([section]) => `- [${section}](#${section.trim().replace(/\s+/g, "-").toLowerCase()})`)
    .join("\n");

  return [
    `---\ncreated: ${draft.created}\n---`,
    `[상위로 이동](${draft.parentHref})`,
    `# ${draft.title.trim()}`,
    "## 목차",
    toc,
    sections,
  ]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}
