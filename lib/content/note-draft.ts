export interface StructuredNoteDraft {
  title: string;
  source: string;
  learned: string;
  confused: string;
  questions: string;
  conclusion: string;
  experiments: string;
  parentHref: string;
}

export function draftToNoteMarkdown(draft: StructuredNoteDraft): string {
  const sections = [
    ["학습 출처", draft.source],
    ["오늘 배운 것", draft.learned],
    ["헷갈린 점", draft.confused],
    ["확인하고 싶은 것", draft.questions],
    ["현재 이해한 결론", draft.conclusion],
    ["메모와 실험", draft.experiments],
  ]
    .filter(([, body]) => body.trim().length > 0)
    .map(([heading, body]) => `## ${heading}\n${body.trim()}`)
    .join("\n\n");

  return [`[상위로 이동](${draft.parentHref})`, `# ${draft.title.trim()}`, sections]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}
