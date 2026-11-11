import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authorize = vi.hoisted(() => vi.fn<() => Promise<Response | null>>(async () => null));
vi.mock("@/lib/auth/access", () => ({ authorizeAdminRequest: authorize }));

describe("settings API", () => {
  const originalSettingsFile = process.env.TIL_STUDIO_SETTINGS_FILE;
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "til-studio-settings-route-"));
    process.env.TIL_STUDIO_SETTINGS_FILE = join(tempDir, "settings.json");
  });

  afterEach(async () => {
    if (originalSettingsFile === undefined) delete process.env.TIL_STUDIO_SETTINGS_FILE;
    else process.env.TIL_STUDIO_SETTINGS_FILE = originalSettingsFile;
    await rm(tempDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
    authorize.mockReset().mockResolvedValue(null);
  });

  it("saves settings without returning secret values", async () => {
    const { GET, POST } = await import("@/app/api/settings/route");

    const postResponse = await POST(
      new Request("http://localhost/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          aiProvider: "gemini",
          openAIKey: "sk-route-secret",
          geminiKey: "gemini-route-secret",
          repositoryOwner: "DawnteaStudio",
          repositoryName: "TIL",
        }),
      }),
    );
    const postBody = await postResponse.json();

    expect(postResponse.status).toBe(200);
    expect(postBody.openAIKeyConfigured).toBe(true);
    expect(postBody.geminiKeyConfigured).toBe(true);
    expect(JSON.stringify(postBody)).not.toContain("sk-route-secret");
    expect(JSON.stringify(postBody)).not.toContain("gemini-route-secret");

    const getBody = await (await GET(new Request("http://localhost/api/settings"))).json();

    expect(getBody.aiProvider).toBe("gemini");
    expect(getBody.repositoryOwner).toBe("DawnteaStudio");
    expect(JSON.stringify(getBody)).not.toContain("sk-route-secret");
  });

  it("denies unauthorized settings reads and writes before parsing a body", async () => {
    const { GET, POST } = await import("@/app/api/settings/route");
    authorize.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await GET(new Request("https://blog.example/api/settings"))).status).toBe(401);
    expect((await POST(new Request("https://blog.example/api/settings", { method: "POST", body: "invalid JSON" }))).status).toBe(401);
  });

  it("lets the owner inspect hosted settings while refusing all browser writes", async () => {
    const { GET, POST } = await import("@/app/api/settings/route");
    vi.stubEnv("TIL_STUDIO_MODE", "hosted");
    const response = await GET(new Request("https://blog.example/api/settings"));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).readOnly).toBe(true);
    const rejected = await POST(new Request("https://blog.example/api/settings", { method: "POST", body: "invalid JSON" }));
    expect(rejected.status).toBe(403);
  });
});
