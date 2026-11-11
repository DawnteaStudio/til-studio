import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { authorizeAdminRequest, getAdminIdentity, requireAdminPage } from "@/lib/auth/access";
import { isHostedMode } from "@/lib/auth/mode";

const session = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: session }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error("redirect " + to); } }));

beforeEach(() => {
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("TIL_STUDIO_MODE", "hosted");
  vi.stubEnv("AUTH_GITHUB_ID", "fake-client");
  vi.stubEnv("AUTH_GITHUB_SECRET", "fake-client-secret");
  vi.stubEnv("AUTH_SECRET", "test-only-session-key-at-least-32-characters");
  vi.stubEnv("AUTH_URL", "https://blog.example");
  vi.stubEnv("TIL_ADMIN_GITHUB_ID", "90132183");
  session.mockReset().mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());

const read = () => new Request("https://blog.example/api/github/tree");
const write = (origin?: string) => new Request("https://blog.example/api/github/save", {
  method: "POST", headers: origin ? { origin } : {}, body: "{}",
});

it("fails closed without a session or complete hosted configuration", async () => {
  expect((await authorizeAdminRequest(read()))?.status).toBe(401);
  session.mockResolvedValue({ user: { id: "90132183", name: "owner" } });
  for (const key of ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTH_SECRET", "AUTH_URL", "TIL_ADMIN_GITHUB_ID"]) {
    const original = process.env[key]!;
    vi.stubEnv(key, "");
    expect((await authorizeAdminRequest(read()))?.status).toBe(401);
    expect(await getAdminIdentity()).toBeNull();
    vi.stubEnv(key, original);
  }
});

it("rejects another identity and reevaluates the owner allowlist on every request", async () => {
  session.mockResolvedValue({ user: { id: "111", name: "other" } });
  expect((await authorizeAdminRequest(read()))?.status).toBe(403);
  expect(await getAdminIdentity()).toBeNull();
  session.mockResolvedValue({ user: { id: "90132183", name: "owner", accessToken: "never-return-this" } });
  expect(await getAdminIdentity()).toEqual({ id: "90132183", name: "owner" });
  expect(await authorizeAdminRequest(read())).toBeNull();
  vi.stubEnv("TIL_ADMIN_GITHUB_ID", "222");
  expect((await authorizeAdminRequest(read()))?.status).toBe(403);
});

it("requires the configured same origin for hosted changes", async () => {
  session.mockResolvedValue({ user: { id: "90132183", name: "owner" } });
  expect(await authorizeAdminRequest(write("https://blog.example"))).toBeNull();
  for (const origin of [undefined, "null", "https://evil.example", "https://blog.example.evil", "http://blog.example"]) {
    expect((await authorizeAdminRequest(write(origin)))?.status).toBe(403);
  }
  const forged = new Request("https://evil.example/api/github/save", {
    method: "POST", headers: { origin: "https://evil.example", "x-forwarded-host": "blog.example" },
  });
  expect((await authorizeAdminRequest(forged))?.status).toBe(403);
});

it("retains desktop access while Vercel cannot opt out through local mode", async () => {
  vi.stubEnv("TIL_STUDIO_MODE", "local");
  expect(isHostedMode()).toBe(false);
  expect(await authorizeAdminRequest(write())).toBeNull();
  expect(await getAdminIdentity()).toEqual({ id: "local", name: "로컬 관리자" });
  expect(session).not.toHaveBeenCalled();
  vi.stubEnv("VERCEL", "1");
  expect(isHostedMode()).toBe(true);
  expect((await authorizeAdminRequest(read()))?.status).toBe(401);
});

it("does not authorize failures and redirects protected page requests to login", async () => {
  session.mockRejectedValue(new Error("session failure"));
  expect((await authorizeAdminRequest(read()))?.status).toBe(401);
  expect(await getAdminIdentity()).toBeNull();
  await expect(requireAdminPage()).rejects.toThrow("redirect /login");
});
