import type { ReactNode } from "react";
import type { StructuredNoteDraft } from "@/lib/content/note-draft";

type NoteDraftField = Exclude<keyof StructuredNoteDraft, "created" | "parentHref">;

interface NoteComposerProps {
  draft: StructuredNoteDraft;
  children?: ReactNode;
  onChange(field: NoteDraftField, value: string): void;
}

const fields: Array<{
  field: NoteDraftField;
  label: string;
  placeholder: string;
  rows?: number;
}> = [
  {
    field: "title",
    label: "제목",
    placeholder: "오늘 공부한 내용을 한 문장으로 적어주세요.",
  },
  {
    field: "source",
    label: "학습 출처",
    placeholder: "강의, 책, 문서, 프로젝트 등 출처를 적어주세요.",
  },
  {
    field: "learned",
    label: "오늘 배운 것",
    placeholder: "오늘 이해한 내용을 편하게 적어주세요.",
    rows: 5,
  },
  {
    field: "confused",
    label: "헷갈린 점",
    placeholder: "정확하지 않아도 괜찮아요. 헷갈린 흐름 그대로 적어주세요.",
    rows: 4,
  },
  {
    field: "questions",
    label: "확인하고 싶은 것",
    placeholder: "실험하거나 더 찾아보고 싶은 질문을 적어주세요.",
    rows: 4,
  },
  {
    field: "conclusion",
    label: "현재 이해한 결론",
    placeholder: "지금 시점의 결론을 짧게 적어주세요.",
    rows: 4,
  },
  {
    field: "experiments",
    label: "메모와 실험",
    placeholder: "코드로 확인할 것, 추가 메모, 예시를 자유롭게 적어주세요.",
    rows: 4,
  },
];

export function NoteComposer({ draft, onChange, children }: NoteComposerProps) {
  function fieldInput(item: (typeof fields)[number]) {
    const inputProps = {
      value: draft[item.field],
      id: item.field === "learned" ? "studio-note-memo" : undefined,
      placeholder: item.placeholder,
      className: "studio-field w-full rounded-2xl px-4 py-3 text-base leading-7 text-[#25221c] placeholder:text-[#807965] focus-visible:outline-2 focus-visible:outline-[#204a78]",
    };
    return (
      <label key={item.field} className="block">
        <span className="mb-2 block text-sm font-semibold text-[#3f3a31]">{item.label}</span>
        {item.rows ? (
          <textarea {...inputProps} rows={item.rows} onChange={(event) => onChange(item.field, event.target.value)} />
        ) : (
          <input {...inputProps} onChange={(event) => onChange(item.field, event.target.value)} />
        )}
      </label>
    );
  }

  return (
    <section className="studio-paper space-y-5 rounded-2xl p-4 md:p-6">
      {fieldInput(fields.find(({ field }) => field === "learned")!)}
      {children}
      {fieldInput(fields.find(({ field }) => field === "title")!)}
      <details className="border-t border-[#204a78]/15 pt-1">
        <summary className="cursor-pointer py-3 text-sm font-semibold text-[#504b40]">추가 메모와 출처</summary>
        <div className="grid gap-4 pb-2">
          {fields.filter(({ field }) => field !== "title" && field !== "learned").map(fieldInput)}
        </div>
      </details>
    </section>
  );
}
