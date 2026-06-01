import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HashLink } from "@/components/public/HashLink";

describe("HashLink", () => {
  it("scrolls to a heading without pushing browser history", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const scrollIntoView = vi.fn();

    render(
      <>
        <div id="개념" ref={(node) => node && (node.scrollIntoView = scrollIntoView)} />
        <HashLink href="#개념">개념</HashLink>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "개념" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(replaceState).toHaveBeenCalledWith(null, "", "#개념");
  });
});
