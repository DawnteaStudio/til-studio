import type { StructuredNoteDraft } from "@/lib/content/note-draft";

type NoteDraftField = Exclude<keyof StructuredNoteDraft, "parentHref">;

interface NoteComposerProps {
  draft: StructuredNoteDraft;
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

export function NoteComposer({ draft, onChange }: NoteComposerProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/60">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Note Draft</p>
        <h2 className="mt-2 text-xl font-semibold text-zinc-950">공부하면서 편하게 적기</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Markdown 문법을 몰라도 괜찮아요. 아래 칸에 자연스럽게 적으면 publish할 때 notes
          형식으로 변환됩니다.
        </p>
      </div>

      <div className="grid gap-4">
        {fields.map((item) => (
          <label key={item.field} className="block">
            <span className="mb-2 block text-sm font-semibold text-zinc-800">{item.label}</span>
            {item.rows ? (
              <textarea
                value={draft[item.field]}
                onChange={(event) => onChange(item.field, event.target.value)}
                placeholder={item.placeholder}
                rows={item.rows}
                className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[15px] leading-7 text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100"
              />
            ) : (
              <input
                value={draft[item.field]}
                onChange={(event) => onChange(item.field, event.target.value)}
                placeholder={item.placeholder}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[15px] text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-100"
              />
            )}
          </label>
        ))}
      </div>
    </section>
  );
}
