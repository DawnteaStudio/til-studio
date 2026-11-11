import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Account, Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { buildAuthConfig } from "@/auth";
import { authConfigurationReady, safeAdminReturnTo } from "@/lib/auth/config";

vi.mock("next-auth", () => ({ default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }) }));
beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("AUTH_GITHUB_ID", "fake-id");
  vi.stubEnv("AUTH_GITHUB_SECRET", "fake-secret");
  vi.stubEnv("AUTH_SECRET", "test-only-session-key-with-at-least-32-characters");
  vi.stubEnv("AUTH_URL", "https://blog.example");
  vi.stubEnv("TIL_ADMIN_GITHUB_ID", "90132183");
});
afterEach(() => vi.unstubAllEnvs());

const account: Account = { type: "oauth", provider: "github", providerAccountId: "90132183", access_token: "private-oauth-token" };
// GitHub's OAuth profile uses a numeric ID even though Auth.js's generic Profile declares a string.
const profile = { id: 90132183, name: "Owner", email: "private@example.test" } as unknown as Profile;

it("requests GitHub profile access without access to private email addresses", () => {
  expect(buildAuthConfig().providers[0]).toMatchObject({
    options: { authorization: { params: { scope: "read:user" } } },
  });
});

it("accepts only the configured numeric GitHub account and excludes provider tokens from JWT/session", async () => {
  const callbacks = buildAuthConfig().callbacks!;
  expect(await callbacks.signIn!({ user: {}, account, profile })).toBe(true);
  expect(await callbacks.signIn!({ user: {}, account, profile: { ...profile, id: "123" } })).toBe(false);
  expect(await callbacks.signIn!({ user: {}, account: { ...account, provider: "untrusted" }, profile })).toBe(false);
  const token = await callbacks.jwt!({ token: {}, user: {}, account, profile });
  expect(token).toEqual({ sub: "90132183", githubId: "90132183", name: "Owner" });
  const sessionCallback = callbacks.session!;
  const sessionArgs = { session: { expires: "2030-01-01", user: { email: profile.email } }, token } as Parameters<typeof sessionCallback>[0];
  expect(await sessionCallback(sessionArgs)).toEqual({ expires: "2030-01-01", user: { id: "90132183", name: "Owner" } });
});

it("does not trust client session updates or stale allowed identities", async () => {
  const callbacks = buildAuthConfig().callbacks!;
  const token: JWT = { githubId: "123", name: "Other" };
  expect(await callbacks.jwt!({ token, user: {}, trigger: "update", session: { githubId: "90132183" } })).toBeNull();
  const valid: JWT = { githubId: "90132183", name: "Owner" };
  expect(await callbacks.jwt!({ token: valid, user: {} })).toEqual(valid);
  vi.stubEnv("TIL_ADMIN_GITHUB_ID", "456");
  expect(await callbacks.jwt!({ token: valid, user: {} })).toBeNull();
  const authorized = callbacks.authorized!;
  expect(await authorized({ auth: { user: { id: "90132183" }, expires: "2030-01-01" } as Session,
    request: {} as Parameters<typeof authorized>[0]["request"] })).toBe(false);
});

it("preserves only local administrator return paths, including Auth.js absolute callbacks", () => {
  const path = "/studio?topic=cs%2Falgorithms&source=Book&practice=ch1";
  expect(safeAdminReturnTo(path)).toBe(path);
  expect(safeAdminReturnTo("https://blog.example" + path)).toBe(path);
  for (const address of ["https://evil.example/studio", "//evil.example/studio", "/\\evil.example/studio", "/api/settings", "/studio/../../api/settings"]) {
    expect(safeAdminReturnTo(address)).toBe("/studio");
  }
});

it("requires a canonical HTTPS origin and complete configuration on Vercel", () => {
  expect(authConfigurationReady()).toBe(true);
  for (const url of ["http://blog.example", "http://localhost:3000", "https://user:password@blog.example", "https://blog.example/path", "bad-url"]) {
    vi.stubEnv("AUTH_URL", url);
    expect(authConfigurationReady()).toBe(false);
  }
});
