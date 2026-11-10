import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useStudioDraft } from "@/components/studio/useStudioDraft";

beforeEach(() => window.localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("restores the final edit immediately and leaves a new or reset draft unsaved", () => {
  const first = renderHook(useStudioDraft);
  expect(localStorage.length).toBe(0);
  act(() => first.result.current.updateDraft({ theoryMarkdown: "마지막 글자" }));
  first.unmount();
  const reopened = renderHook(useStudioDraft);
  expect(reopened.result.current.draft.theoryMarkdown).toBe("마지막 글자");
  expect(reopened.result.current.savedAt).toEqual(expect.any(Number));
  act(() => { expect(reopened.result.current.resetDraft()).toBe(true); });
  expect(reopened.result.current.savedAt).toBeNull();
  reopened.unmount();
  expect(renderHook(useStudioDraft).result.current.draft.theoryMarkdown).toBe("");
});

it("merges distinct note fields written before a storage event arrives", () => {
  const first = renderHook(useStudioDraft);
  const second = renderHook(useStudioDraft);
  act(() => first.result.current.updateDraft(({ noteDraft }) => ({ noteDraft: { ...noteDraft, title: "자료구조" } })));
  act(() => second.result.current.updateDraft(({ noteDraft }) => ({ noteDraft: { ...noteDraft, learned: "트리" } })));
  expect(renderHook(useStudioDraft).result.current.draft.noteDraft).toMatchObject({ title: "자료구조", learned: "트리" });
});

it("keeps competing edits visible and reports when the local edit cannot be saved", () => {
  const first = renderHook(useStudioDraft);
  const second = renderHook(useStudioDraft);
  act(() => first.result.current.updateDraft({ theoryTitle: "첫 번째" }));
  act(() => second.result.current.updateDraft({ theoryTitle: "두 번째" }));
  expect(second.result.current.storageError).toBe(true);
  expect(second.result.current.draft.theoryTitle).toBe("두 번째");
  expect(renderHook(useStudioDraft).result.current.draft.theoryTitle).toBe("첫 번째");
});

it("recovers from a failed write without dropping the unsaved text", () => {
  const editor = renderHook(useStudioDraft);
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota"); });
  act(() => editor.result.current.updateDraft({ theoryTitle: "아직 메모리에만" }));
  expect(editor.result.current.storageError).toBe(true);
  expect(editor.result.current.savedAt).toBeNull();
  act(() => editor.result.current.updateDraft({ theoryMarkdown: "본문" }));
  expect(editor.result.current.storageError).toBe(false);
  expect(renderHook(useStudioDraft).result.current.draft.theoryTitle).toBe("아직 메모리에만");
});

it("opens corrupt storage without losing it merely by visiting Studio", () => {
  const editor = renderHook(useStudioDraft);
  act(() => editor.result.current.updateDraft({ sourceName: "자료" }));
  editor.unmount();
  const key = localStorage.key(0)!;
  localStorage.setItem(key, "{broken");
  const fresh = renderHook(useStudioDraft);
  expect(fresh.result.current.storageError).toBe(true);
  expect(fresh.result.current.draft.sourceName).toBe("");
  expect(localStorage.getItem(key)).toBe("{broken");
});

it("adopts remote saves and resets without rewriting them during cleanup", () => {
  const first = renderHook(useStudioDraft);
  const second = renderHook(useStudioDraft);
  act(() => first.result.current.updateDraft({ theoryTitle: "다른 탭의 작업" }));
  const key = localStorage.key(0)!;
  act(() => window.dispatchEvent(new StorageEvent("storage", { key })));
  expect(second.result.current.draft.theoryTitle).toBe("다른 탭의 작업");
  act(() => { first.result.current.resetDraft(); });
  second.unmount();
  expect(localStorage.getItem(key)).toBeNull();
});

it("persists only fields in the draft format", () => {
  const editor = renderHook(useStudioDraft);
  const response = {
    title: "KMP", concept: "", keyPoints: [], cautions: [], sources: [],
    providerDiagnostics: "private response metadata",
  };
  act(() => editor.result.current.updateDraft({ theoryResearch: response }));
  expect(localStorage.getItem(localStorage.key(0)!)).not.toContain("private response metadata");
});

it("reports when a reset would erase a newer draft or storage refuses deletion", () => {
  const first = renderHook(useStudioDraft);
  const stale = renderHook(useStudioDraft);
  act(() => first.result.current.updateDraft({ theoryTitle: "다른 탭의 초안" }));
  act(() => { expect(stale.result.current.resetDraft()).toBe(false); });
  expect(stale.result.current.draft.theoryTitle).toBe("다른 탭의 초안");
  vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => { throw new Error("denied"); });
  act(() => { expect(stale.result.current.resetDraft()).toBe(false); });
  expect(stale.result.current.storageError).toBe(true);
  expect(renderHook(useStudioDraft).result.current.draft.theoryTitle).toBe("다른 탭의 초안");
});
