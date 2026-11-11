// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import { encode } from "next-auth/jwt";
import { GET } from "@/app/api/auth/[...nextauth]/route";
import proxy from "@/proxy";

const secret = "test-only-session-secret-longer-than-32-characters";
const cookieName = "__Secure-authjs.session-token";
beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("AUTH_GITHUB_ID", "fake-client");
  vi.stubEnv("AUTH_GITHUB_SECRET", "fake-client-secret");
  vi.stubEnv("AUTH_SECRET", secret);
  vi.stubEnv("AUTH_URL", "https://blog.example");
  vi.stubEnv("TIL_ADMIN_GITHUB_ID", "90132183");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

async function ownerCookie(id = "90132183") {
  return `${cookieName}=${await encode({ secret, salt: cookieName,
    token: { githubId: id, name: "Owner", access_token: "private-provider-token" } })}`;
}
function request(path: string, cookie = "") {
  return new NextRequest("https://blog.example" + path, { headers: { cookie } });
}

it("accepts a valid encrypted owner session without exposing provider tokens", async () => {
  const response = await GET(request("/api/auth/session", await ownerCookie()));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ user: { id: "90132183", name: "Owner" }, expires: expect.any(String) });
  expect(response.headers.get("cache-control")).toContain("no-cache");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("Secure");
});

it("rejects forged, foreign and revoked encrypted sessions", async () => {
  for (const cookie of [cookieName + "=forged", await ownerCookie("123")]) {
    const response = await GET(request("/api/auth/session", cookie));
    expect(await response.json()).toBeNull();
  }
  const prior = await ownerCookie();
  vi.stubEnv("TIL_ADMIN_GITHUB_ID", "456");
  expect(await (await GET(request("/api/auth/session", prior))).json()).toBeNull();
});

it("protects Studio before rendering and preserves practice deep-link return paths", async () => {
  const path = "/studio?topic=cs%2Falgorithms&source=Book&practice=ch1";
  const denied = await proxy(request(path), {} as NextFetchEvent);
  expect(denied?.status).toBe(307);
  const destination = new URL(denied!.headers.get("location")!);
  expect(destination.pathname).toBe("/login");
  expect(destination.searchParams.get("callbackUrl")).toMatch(/\/studio\?topic=cs%2Falgorithms&source=Book&practice=ch1$/);
  const allowed = await proxy(request(path, await ownerCookie()), {} as NextFetchEvent);
  expect(allowed?.headers.get("x-middleware-next")).toBe("1");
});

it("returns a safe failure before invoking OAuth with incomplete hosted setup", async () => {
  vi.stubEnv("AUTH_SECRET", "");
  const response = await GET(request("/api/auth/session", await ownerCookie()));
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
