interface NoteTemplateInput {
  title: string;
  source?: string;
  parentHref: string;
  optionalSections?: string[];
}

interface TheoryTemplateInput {
  title: string;
  parentHref: string;
  relatedNotes?: string[];
}

const coreNoteSections = [
  "학습 출처",
  "오늘 배운 것",
  "헷갈린 점",
  "확인하고 싶은 것",
  "현재 이해한 결론",
];

const theorySections = ["개념", "핵심 내용", "주의할 점", "관련 notes"];

function headingAnchor(section: string): string {
  return section.trim().replace(/\s+/g, "-").toLowerCase();
}

function toc(sections: string[]): string {
  return sections.map((section) => `- [${section}](#${headingAnchor(section)})`).join("\n");
}

function sectionBlock(section: string, content = ""): string {
  return `## ${section}\n\n${content}`.trimEnd();
}

function relativeNoteLink(notePath: string): string {
  const file = notePath.split("/").at(-1) ?? notePath;
  const notesIndex = notePath.indexOf("/notes/");
  const href = notesIndex >= 0 ? `../notes/${notePath.slice(notesIndex + "/notes/".length)}` : notePath;
  return `- [${file}](${href})`;
}

export function createNoteTemplate(input: NoteTemplateInput): string {
  const sections = [...coreNoteSections, ...(input.optionalSections ?? [])];
  const blocks = sections.map((section) =>
    section === "학습 출처" ? sectionBlock(section, input.source ?? "") : sectionBlock(section),
  );

  return [
    `# ${input.title}`,
    "",
    `[상위로 이동](${input.parentHref})`,
    "",
    "## 목차",
    "",
    toc(sections),
    "",
    ...blocks.flatMap((block) => [block, ""]),
  ].join("\n").trimEnd() + "\n";
}

export function createTheoryTemplate(input: TheoryTemplateInput): string {
  const related = input.relatedNotes?.length
    ? input.relatedNotes.map(relativeNoteLink).join("\n")
    : "";

  const blocks = theorySections.map((section) =>
    section === "관련 notes" ? sectionBlock(section, related) : sectionBlock(section),
  );

  return [
    `# ${input.title}`,
    "",
    `[상위로 이동](${input.parentHref})`,
    "",
    "## 목차",
    "",
    toc(theorySections),
    "",
    ...blocks.flatMap((block) => [block, ""]),
  ].join("\n").trimEnd() + "\n";
}
