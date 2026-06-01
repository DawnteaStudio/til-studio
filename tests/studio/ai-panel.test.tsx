import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiPanel } from "@/components/studio/AiPanel";

describe("AiPanel", () => {
  it("keeps note cleanup and removes the missing section action", () => {
    render(<AiPanel onCleanup={vi.fn()} isBusy={false} />);

    expect(screen.getByRole("button", { name: "notes 형식으로 다듬기" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "빠진 섹션 찾기" })).toBeNull();
  });
});
