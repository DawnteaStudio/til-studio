import { afterEach, expect, it, vi } from "vitest";
import { isPublishedPath, publicVisibleRoots, publishedRoots } from "@/lib/content/publication";

afterEach(() => vi.unstubAllEnvs());

it("fails closed for missing, empty, malformed, or unsafe hosted publication settings", () => {
  vi.stubEnv("TIL_STUDIO_MODE", "hosted");
  for (const value of ["", "[]", "{", '["cs", "../private"]', '["cs", null]']) {
    vi.stubEnv("TIL_PUBLIC_ROOTS", value);
    expect(publishedRoots()).toEqual([]);
    expect(isPublishedPath("cs/algorithms/note.md")).toBe(false);
  }
});

it("permits cookie filters to narrow the configured publication scope", () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("TIL_PUBLIC_ROOTS", '["cs","languages"]');
  const paths = ["cs/a.md", "languages/c.md", "private/a.md"];
  expect(publicVisibleRoots(paths, [])).toEqual(["cs", "languages"]);
  expect(publicVisibleRoots(paths, ["private", "cs"])).toEqual(["cs"]);
  expect(publicVisibleRoots(paths, ["private"])).toEqual([]);
  expect(isPublishedPath("private/a.md")).toBe(false);
  expect(isPublishedPath("cs/../private/a.md")).toBe(false);
  expect(isPublishedPath("languages/c.md")).toBe(true);
});

it("retains local folder selection outside hosted mode", () => {
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("TIL_STUDIO_MODE", "");
  expect(publishedRoots()).toBeNull();
  expect(publicVisibleRoots(["cs/a.md", "private/a.md"], [])).toEqual(["cs", "private"]);
});
