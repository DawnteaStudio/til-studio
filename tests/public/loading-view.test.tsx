import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteLoadingView } from "@/components/public/RouteLoadingView";

describe("RouteLoadingView", () => {
  it("shows that a page transition is in progress", () => {
    render(<RouteLoadingView />);

    expect(screen.getByText("불러오는 중")).toBeTruthy();
    expect(screen.getByText("화면을 준비하고 있습니다")).toBeTruthy();
  });
});
