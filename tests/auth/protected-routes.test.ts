import crypto from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";

const guard = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/access", () => ({ authorizeAdminRequest: guard }));
vi.mock("@/lib/settings/runtime-settings", () => ({ getRuntimeSetting: (key: string) => key === "GITHUB_APP_WEBHOOK_SECRET" ? "test-webhook" : undefined }));
afterEach(() => guard.mockReset());

it.each([
  ["github/save", "GET", () => import("@/app/api/github/save/route").then((route) => route.GET)],
  ["github/save", "POST", () => import("@/app/api/github/save/route").then((route) => route.POST)],
  ["github/tree", "GET", () => import("@/app/api/github/tree/route").then((route) => route.GET)],
  ["github/source", "POST", () => import("@/app/api/github/source/route").then((route) => route.POST)],
  ["github/delete", "POST", () => import("@/app/api/github/delete/route").then((route) => route.POST)],
  ["github/practice-link", "POST", () => import("@/app/api/github/practice-link/route").then((route) => route.POST)],
  ["github/sync", "POST", () => import("@/app/api/github/sync/route").then((route) => route.POST)],
  ["ai/note-cleanup", "POST", () => import("@/app/api/ai/note-cleanup/route").then((route) => route.POST)],
  ["ai/theory-research", "POST", () => import("@/app/api/ai/theory-research/route").then((route) => route.POST)],
])("checks authorization before handling %s %s", async (path, method, load) => {
  guard.mockResolvedValue(Response.json({ error: "denied" }, { status: 401 }));
  const handler = await load();
  const request = new Request("https://blog.example/api/" + path, { method,
    ...(method === "GET" ? {} : { body: "invalid JSON that must not be parsed" }) });
  const response = await handler(request);
  expect(response.status).toBe(401);
  expect(guard).toHaveBeenCalledWith(request);
});

it("keeps the signed GitHub webhook independent of visitor sessions", async () => {
  const { POST } = await import("@/app/api/github/webhook/route");
  const body = "{}";
  const signature = "sha256=" + crypto.createHmac("sha256", "test-webhook").update(body).digest("hex");
  const response = await POST(new Request("https://blog.example/api/github/webhook", {
    method: "POST", body, headers: { "x-hub-signature-256": signature },
  }));
  expect(response.status).toBe(200);
  expect(guard).not.toHaveBeenCalled();
});
