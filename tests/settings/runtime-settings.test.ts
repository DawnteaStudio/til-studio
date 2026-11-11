import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRuntimeSetting,
  readSettingsSnapshot,
  saveRuntimeSettings,
} from "@/lib/settings/runtime-settings";

describe("runtime settings", () => {
  const originalSettingsFile = process.env.TIL_STUDIO_SETTINGS_FILE;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "til-studio-settings-"));
    process.env.TIL_STUDIO_SETTINGS_FILE = join(tempDir, "settings.json");
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(async () => {
    if (originalSettingsFile === undefined) delete process.env.TIL_STUDIO_SETTINGS_FILE;
    else process.env.TIL_STUDIO_SETTINGS_FILE = originalSettingsFile;
    if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAIKey;
    await rm(tempDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("stores secrets server-side while returning only configured flags", async () => {
    await saveRuntimeSettings({
      aiProvider: "gemini",
      openAIModel: "gpt-4.1-mini",
      openAIKey: "sk-test-secret",
      geminiModel: "gemini-custom",
    });

    const snapshot = await readSettingsSnapshot();

    expect(snapshot.aiProvider).toBe("gemini");
    expect(snapshot.openAIModel).toBe("gpt-4.1-mini");
    expect(snapshot.geminiModel).toBe("gemini-custom");
    expect(snapshot.openAIKeyConfigured).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain("sk-test-secret");
    expect(await getRuntimeSetting("OPENAI_API_KEY")).toBe("sk-test-secret");
  });

  it("keeps existing secrets when a later save omits secret fields", async () => {
    await saveRuntimeSettings({ openAIKey: "sk-original" });
    await saveRuntimeSettings({ aiProvider: "openai", openAIModel: "gpt-4o" });

    expect(await getRuntimeSetting("OPENAI_API_KEY")).toBe("sk-original");
    const rawFile = await readFile(process.env.TIL_STUDIO_SETTINGS_FILE!, "utf8");
    expect(rawFile).toContain("sk-original");
  });

  it("ignores local settings on a hosted server and refuses local writes", async () => {
    saveRuntimeSettings({ openAIKey: "local-key" });
    const before = await readFile(process.env.TIL_STUDIO_SETTINGS_FILE!, "utf8");
    vi.stubEnv("TIL_STUDIO_MODE", "hosted");
    vi.stubEnv("OPENAI_API_KEY", "environment-key");
    expect(getRuntimeSetting("OPENAI_API_KEY")).toBe("environment-key");
    expect(readSettingsSnapshot().readOnly).toBe(true);
    expect(() => saveRuntimeSettings({ openAIKey: "replacement" })).toThrow(/환경변수/);
    expect(await readFile(process.env.TIL_STUDIO_SETTINGS_FILE!, "utf8")).toBe(before);
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(getRuntimeSetting("OPENAI_API_KEY")).toBeUndefined();
  });

  it("automatically uses environment settings when Vercel is present", () => {
    saveRuntimeSettings({ openAIModel: "local-model" });
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("OPENAI_MODEL", "hosted-model");
    expect(readSettingsSnapshot()).toMatchObject({ readOnly: true, openAIModel: "hosted-model" });
  });
});
