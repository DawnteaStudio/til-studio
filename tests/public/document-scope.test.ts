import { afterEach, expect, it, vi } from "vitest";
import DocumentPage from "@/app/docs/[...slug]/page";

const archive = vi.hoisted(() => vi.fn());
const resolve = vi.hoisted(() => vi.fn());
vi.mock("@/components/public/reader-archive", () => ({ loadReaderArchive: archive }));
vi.mock("@/lib/github/repository", () => ({ resolveRepositoryMarkdownDocument: resolve }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

afterEach(() => { vi.unstubAllEnvs(); archive.mockReset(); resolve.mockReset(); });

it("rejects a direct private URL before fetching archive or document data", async () => {
  vi.stubEnv("TIL_STUDIO_MODE", "hosted");
  vi.stubEnv("TIL_PUBLIC_ROOTS", '["cs"]');
  await expect(DocumentPage({ params: Promise.resolve({ slug: ["private", "secret.md"] }) })).rejects.toThrow("NOT_FOUND");
  expect(archive).not.toHaveBeenCalled();
  expect(resolve).not.toHaveBeenCalled();
});

it("checks the resolved document path before showing a public URL", async () => {
  vi.stubEnv("TIL_STUDIO_MODE", "hosted");
  vi.stubEnv("TIL_PUBLIC_ROOTS", '["cs"]');
  archive.mockResolvedValue({ roots: ["cs"], articles: [] });
  resolve.mockResolvedValue({ path: "private/secret.md" });
  await expect(DocumentPage({ params: Promise.resolve({ slug: ["cs", "public.md"] }) })).rejects.toThrow("NOT_FOUND");
});
