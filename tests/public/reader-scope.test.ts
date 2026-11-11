import { afterEach, expect, it, vi } from "vitest";
import { loadReaderArchive } from "@/components/public/reader-archive";

const archive = vi.hoisted(() => vi.fn());
const cookieValue = vi.hoisted(() => ({ value: "" }));
vi.mock("@/lib/github/archive", () => ({ fetchRepositoryArchive: archive }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => cookieValue }) }));

afterEach(() => { vi.unstubAllEnvs(); archive.mockReset(); cookieValue.value = ""; });

it("removes private data from the reader payload even when a cookie requests it", async () => {
  vi.stubEnv("TIL_STUDIO_MODE", "hosted");
  vi.stubEnv("TIL_PUBLIC_ROOTS", '["cs"]');
  cookieValue.value = encodeURIComponent('["cs","private"]');
  archive.mockResolvedValue({
    owner: "author", repo: "TIL", branch: "main",
    allPaths: ["cs/note.md", "private/note.md"],
    articles: [{ area: "cs", title: "Public" }, { area: "private", title: "Hidden" }],
    practices: [{ topicPath: "cs/algorithms", slug: "public" }, { topicPath: "private/research", slug: "hidden" }],
  });
  expect(await loadReaderArchive()).toMatchObject({
    roots: ["cs"], articles: [{ area: "cs", title: "Public" }],
    practices: [{ topicPath: "cs/algorithms", slug: "public" }],
  });
});

it("returns no readable folders or content when the hosted scope is missing", async () => {
  vi.stubEnv("TIL_STUDIO_MODE", "hosted");
  vi.stubEnv("TIL_PUBLIC_ROOTS", "");
  archive.mockResolvedValue({
    allPaths: ["cs/note.md"], articles: [{ area: "cs" }],
    practices: [{ topicPath: "cs/algorithms" }],
  });
  expect(await loadReaderArchive()).toMatchObject({ roots: [], articles: [], practices: [] });
});
