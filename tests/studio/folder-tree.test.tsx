import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { treeFromPaths } from "@/lib/content/indexer";
import { FolderTree } from "@/components/studio/FolderTree";

describe("FolderTree workspace picker", () => {
  afterEach(() => cleanup());

  const tree = treeFromPaths([
    "cs/algorithms/README.md",
    "cs/algorithms/theory/kmp.md",
    "cs/algorithms/notes/APSS/ch6.md",
    "languages/javascript/theory/prototype.md",
  ]);

  it("selects a new note topic without exposing source controls or raw notes/theory folders", () => {
    const onSelectPath = vi.fn();

    render(
      <FolderTree
        tree={tree}
        selectedPath=""
        draftKind="note"
        visibleRootPaths={["cs", "languages"]}
        onDraftKindChange={vi.fn()}
        onVisibleRootPathsChange={vi.fn()}
        onSelectPath={onSelectPath}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "cs" }));
    fireEvent.click(screen.getByRole("button", { name: "새 토픽" }));
    fireEvent.change(screen.getByLabelText("새 토픽 이름"), { target: { value: "Graph Theory" } });

    expect(onSelectPath).toHaveBeenLastCalledWith("cs/graph-theory");
    expect(screen.queryByText("Source")).toBeNull();
    expect(screen.queryByLabelText("새 자료 폴더")).toBeNull();
    expect(screen.queryByRole("button", { name: "notes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "theory" })).toBeNull();
  });

  it("switches between notes and theory workspaces", () => {
    const onDraftKindChange = vi.fn();

    render(
      <FolderTree
        tree={tree}
        selectedPath="cs/algorithms"
        draftKind="note"
        visibleRootPaths={["cs", "languages"]}
        onDraftKindChange={onDraftKindChange}
        onVisibleRootPathsChange={vi.fn()}
        onSelectPath={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Theory", exact: true }));

    expect(onDraftKindChange).toHaveBeenCalledWith("theory");
  });
});
