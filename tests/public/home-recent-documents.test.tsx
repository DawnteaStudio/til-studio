import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { folderVisibilityStorageKey } from "@/lib/content/visibility";
import { HomeRecentDocuments } from "@/components/public/HomeRecentDocuments";

describe("HomeRecentDocuments", () => {
  const paths = [
    "README.md",
    "README_ko.md",
    "coding-test/README.md",
    "coding-test/code_tree/250827/README.md",
    "coding-test/code_tree/250827/연속되는 수 2/README.md",
    "coding-test/programmers/a.md",
    "cs/network/README.md",
    "cs/network/README.en.md",
    "cs/network/theory/network-layer.md",
    "languages/javascript/theory/object.md",
    "projects/app/notes/log/day-1.md",
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("hides recent documents from roots disabled in Studio", () => {
    window.localStorage.setItem(folderVisibilityStorageKey, JSON.stringify(["cs"]));

    render(<HomeRecentDocuments paths={paths} />);

    expect(screen.getByText("cs/network/theory/network-layer.md")).toBeTruthy();
    expect(screen.queryByText("README.md")).toBeNull();
    expect(screen.queryByText("README_ko.md")).toBeNull();
    expect(screen.queryByText("coding-test/README.md")).toBeNull();
    expect(screen.queryByText("coding-test/code_tree/250827/README.md")).toBeNull();
    expect(screen.queryByText("coding-test/code_tree/250827/연속되는 수 2/README.md")).toBeNull();
    expect(screen.queryByText("coding-test/programmers/a.md")).toBeNull();
    expect(screen.queryByText("cs/network/README.md")).toBeNull();
    expect(screen.queryByText("cs/network/README.en.md")).toBeNull();
    expect(screen.queryByText("languages/javascript/theory/object.md")).toBeNull();
    expect(screen.queryByText("projects/app/notes/log/day-1.md")).toBeNull();
  });

  it("hides readme documents when every folder is visible", () => {
    render(<HomeRecentDocuments paths={paths} />);

    expect(screen.getByText("coding-test/programmers/a.md")).toBeTruthy();
    expect(screen.getByText("cs/network/theory/network-layer.md")).toBeTruthy();
    expect(screen.getByText("languages/javascript/theory/object.md")).toBeTruthy();
    expect(screen.getByText("projects/app/notes/log/day-1.md")).toBeTruthy();
    expect(screen.queryByText("README.md")).toBeNull();
    expect(screen.queryByText("README_ko.md")).toBeNull();
    expect(screen.queryByText("coding-test/README.md")).toBeNull();
    expect(screen.queryByText("coding-test/code_tree/250827/README.md")).toBeNull();
    expect(screen.queryByText("coding-test/code_tree/250827/연속되는 수 2/README.md")).toBeNull();
    expect(screen.queryByText("cs/network/README.md")).toBeNull();
    expect(screen.queryByText("cs/network/README.en.md")).toBeNull();
  });

  it("shows only non-readme coding-test documents when coding-test is visible", () => {
    window.localStorage.setItem(folderVisibilityStorageKey, JSON.stringify(["coding-test"]));

    render(<HomeRecentDocuments paths={paths} />);

    expect(screen.getByText("coding-test/programmers/a.md")).toBeTruthy();
    expect(screen.queryByText("coding-test/README.md")).toBeNull();
    expect(screen.queryByText("coding-test/code_tree/250827/README.md")).toBeNull();
    expect(screen.queryByText("coding-test/code_tree/250827/연속되는 수 2/README.md")).toBeNull();
    expect(screen.queryByText("cs/network/theory/network-layer.md")).toBeNull();
  });
});
