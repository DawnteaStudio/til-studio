import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

    const getBody = await (await GET()).json();

    expect(getBody.aiProvider).toBe("gemini");
    expect(getBody.repositoryOwner).toBe("DawnteaStudio");
    expect(JSON.stringify(getBody)).not.toContain("sk-route-secret");
  });
});
