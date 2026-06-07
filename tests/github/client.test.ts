import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { githubConfigFromEnv } from "@/lib/github/client";
import { saveRuntimeSettings } from "@/lib/settings/runtime-settings";

describe("GitHub client configuration", () => {
  const originalSettingsFile = process.env.TIL_STUDIO_SETTINGS_FILE;
  const originalAppId = process.env.GITHUB_APP_ID;
  const originalPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const originalInstallationId = process.env.GITHUB_INSTALLATION_ID;
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "til-studio-github-settings-"));
    process.env.TIL_STUDIO_SETTINGS_FILE = join(tempDir, "settings.json");
    process.env.GITHUB_APP_ID = "env-app";
    process.env.GITHUB_APP_PRIVATE_KEY = "env-private";
    process.env.GITHUB_INSTALLATION_ID = "env-installation";
  });

  afterEach(async () => {
    if (originalSettingsFile === undefined) delete process.env.TIL_STUDIO_SETTINGS_FILE;
    else process.env.TIL_STUDIO_SETTINGS_FILE = originalSettingsFile;
    if (originalAppId === undefined) delete process.env.GITHUB_APP_ID;
    else process.env.GITHUB_APP_ID = originalAppId;
    if (originalPrivateKey === undefined) delete process.env.GITHUB_APP_PRIVATE_KEY;
    else process.env.GITHUB_APP_PRIVATE_KEY = originalPrivateKey;
    if (originalInstallationId === undefined) delete process.env.GITHUB_INSTALLATION_ID;
    else process.env.GITHUB_INSTALLATION_ID = originalInstallationId;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uses saved runtime GitHub credentials before process env values", () => {
    saveRuntimeSettings({
      githubAppId: "runtime-app",
      githubPrivateKey: "line-1\\nline-2",
      githubInstallationId: "runtime-installation",
    });

    expect(githubConfigFromEnv()).toEqual({
      appId: "runtime-app",
      privateKey: "line-1\nline-2",
      installationId: "runtime-installation",
    });
  });
});
