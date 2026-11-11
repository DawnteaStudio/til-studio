import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NoteComposer } from "@/components/studio/NoteComposer";
import { emptyDraft } from "@/lib/content/studio-draft";

afterEach(cleanup);

it("keeps restored memo contents out of the field label", () => {
  const draft = { ...emptyDraft("2026-11-11").noteDraft, learned: "다른 기기에서 저장한 본문" };
  render(<NoteComposer draft={draft} onChange={vi.fn()} />);
  const memo = screen.getByDisplayValue(draft.learned) as HTMLTextAreaElement;
  expect(memo.labels?.[0]?.textContent?.trim()).toBe("오늘 배운 것");
  expect(screen.getByLabelText("오늘 배운 것", { exact: true })).toBe(memo);
});
