import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { folderVisibilityStorageKey } from "@/lib/content/visibility";
import { HomeRecentDocuments } from "@/components/public/HomeRecentDocuments";

describe("HomeRecentDocuments", () => {
  const paths = [
    "README.md",
    "cs/network/README.md",
    "cs/network/theory/network-layer.md",
    "languages/javascript/theory/object.md",
    "projects/app/notes/log/day-1.md",
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hides recent documents from roots disabled in Studio", () => {
    window.localStorage.setItem(folderVisibilityStorageKey, JSON.stringify(["cs"]));

    render(<HomeRecentDocuments paths={paths} />);

    expect(screen.getByText("cs/network/theory/network-layer.md")).toBeTruthy();
    expect(screen.queryByText("README.md")).toBeNull();
    expect(screen.queryByText("cs/network/README.md")).toBeNull();
    expect(screen.queryByText("languages/javascript/theory/object.md")).toBeNull();
    expect(screen.queryByText("projects/app/notes/log/day-1.md")).toBeNull();
  });
});
