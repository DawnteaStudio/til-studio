import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DocumentView } from "@/components/public/DocumentView";
import { indexArchive } from "@/lib/content/archive-index";
import { indexMarkdownDocument } from "@/lib/content/indexer";

vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
afterEach(cleanup);

const source = "languages/c/notes/교재 A";
const repo = { owner: "other-owner", repo: "Lab", branch: "study/trunk" };

function renderArticle(filename: string, body: string, files: string[]) {
  const path = source + "/note/" + filename;
  const { articles } = indexArchive([{ path, body, updated: null }], [path, ...files]);
  return render(<DocumentView article={articles[0]} document={{ ...repo, ...indexMarkdownDocument({ path, body }) }} />);
}

it("opens existing explicit practice folders in this source and the configured GitHub branch", () => {
  const name = "Lab [한글] #2";
  renderArticle("chapter.md", '---\nsrc:\n  - "Lab [한글] #2"\n  - "미등록"\n---\n# 실습', [
    source + "/src/" + name + "/main.c",
    "languages/c/notes/다른 교재/src/미등록/main.c",
    source + "/src/미등록/.gitkeep",
  ]);
  const links = within(screen.getByRole("navigation", { name: "연결된 실습" })).getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0].textContent).toBe(name);
  expect(links[0].getAttribute("href")).toBe(
    "https://github.com/other-owner/Lab/tree/study%2Ftrunk/languages/c/notes/%EA%B5%90%EC%9E%AC%20A/src/Lab%20%5B%ED%95%9C%EA%B8%80%5D%20%232",
  );
});

it("uses the same-name fallback and omits the section when that code is absent", () => {
  const view = renderArticle("Ch1.md", "# 첫 장", [source + "/src/Ch1/main.c"]);
  expect(within(screen.getByRole("navigation", { name: "연결된 실습" })).getByRole("link", { name: "Ch1" })).toBeTruthy();
  view.unmount();
  renderArticle("Ch1.md", "# 첫 장", ["languages/c/notes/다른 교재/src/Ch1/main.c"]);
  expect(screen.queryByRole("navigation", { name: "연결된 실습" })).toBeNull();
});
