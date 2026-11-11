import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DraftSyncPanel } from "@/components/studio/DraftSyncPanel";
import { emptyDraft, exportDraft } from "@/lib/content/studio-draft";

afterEach(cleanup);
function store() {
  return {
    draft: emptyDraft("2026-11-11"), savedAt:null, storageError:false, hydrated:true,
    cloudStatus:"saved" as const, cloudSavedAt:"2026-11-11T00:00:00.000Z",cloudError:"",
    conflict:null, recoveries:[], importDraft:vi.fn(),exportDraft:vi.fn(()=>""),retry:vi.fn(),
    resolveConflict:vi.fn(),
  };
}
it("imports a v1 export with explicit file selection", async () => {
  const state = store();
  render(<DraftSyncPanel store={state} hosted />);
  const draft = {...state.draft,theoryTitle:"Imported"};
  const file = new File([exportDraft(draft)],"draft.json",{type:"application/json"});
  Object.defineProperty(file,"text",{value:async()=>exportDraft(draft)});
  fireEvent.change(screen.getByLabelText("초안 JSON 가져오기"),{target:{files:[file]}});
  await waitFor(()=>expect(state.importDraft).toHaveBeenCalled());
  expect(JSON.parse(state.importDraft.mock.calls[0][0]).draft.theoryTitle).toBe("Imported");
});
it("shows both competing versions and requires an explicit resolution", () => {
  const state = store();
  const local = {...state.draft,theoryTitle:"Local",theoryMarkdown:"Local text",draftKind:"theory" as const};
  const remote = {...local,theoryMarkdown:"Remote text"};
  render(<DraftSyncPanel hosted store={{...state,draft:local,cloudStatus:"conflict",conflict:{
    remote:{revision:"new",draft:remote,updatedAt:"2026-11-11T00:00:00.000Z",mutationId:"remote"},
  }}} />);
  expect(screen.getByLabelText("이 기기의 초안").textContent).toContain("Local text");
  expect(screen.getByLabelText("서버의 초안").textContent).toContain("Remote text");
  expect(state.resolveConflict).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"이 기기 초안으로 저장"}));
  expect(state.resolveConflict).toHaveBeenCalledWith("local");
});
it("shows the current structured version instead of a stale manual edit in a conflict", () => {
  const state = store();
  state.draft.noteDraft.learned = "current form";
  state.draft.noteVersion = {base:"an older form",markdown:"stale manual edit"};
  render(<DraftSyncPanel hosted store={{...state,conflict:{
    remote:{revision:"new",draft:state.draft,updatedAt:null,mutationId:"remote"},
  }}} />);
  expect(screen.getByLabelText("이 기기의 초안").textContent).toContain("current form");
  expect(screen.getByLabelText("이 기기의 초안").textContent).not.toContain("stale manual edit");
});
