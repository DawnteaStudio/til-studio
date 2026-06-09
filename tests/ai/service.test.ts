import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAIProviderName, parseModelJson } from "@/lib/ai/service";
import { getGeminiModel } from "@/lib/ai/providers/gemini";
import { getOpenAIModel } from "@/lib/ai/providers/openai";
import { saveRuntimeSettings } from "@/lib/settings/runtime-settings";

describe("OpenAI service configuration", () => {
  const originalSettingsFile = process.env.TIL_STUDIO_SETTINGS_FILE;
  const originalModel = process.env.OPENAI_MODEL;
  const originalGeminiModel = process.env.GEMINI_MODEL;
  const originalProvider = process.env.AI_PROVIDER;
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "til-studio-ai-settings-"));
    process.env.TIL_STUDIO_SETTINGS_FILE = join(tempDir, "settings.json");
  });

  afterEach(async () => {
    if (originalSettingsFile === undefined) delete process.env.TIL_STUDIO_SETTINGS_FILE;
    else process.env.TIL_STUDIO_SETTINGS_FILE = originalSettingsFile;
    if (originalModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalModel;
    if (originalGeminiModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalGeminiModel;
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it("uses OpenAI as the default AI provider", () => {
    delete process.env.AI_PROVIDER;

    expect(getAIProviderName()).toBe("openai");
  });

  it("selects Gemini when AI_PROVIDER is configured", () => {
    process.env.AI_PROVIDER = "gemini";

    expect(getAIProviderName()).toBe("gemini");
  });

  it("uses OPENAI_MODEL when configured", () => {
    process.env.OPENAI_MODEL = "gpt-custom-mini";

    expect(getOpenAIModel()).toBe("gpt-custom-mini");
  });

  it("falls back to a dated gpt-4o-mini model when no model is configured", () => {
    delete process.env.OPENAI_MODEL;

    expect(getOpenAIModel()).toBe("gpt-4o-mini-2024-07-18");
  });

  it("uses GEMINI_MODEL or the Gemini default", () => {
    delete process.env.GEMINI_MODEL;
    expect(getGeminiModel()).toBe("gemini-2.5-flash");

    process.env.GEMINI_MODEL = "gemini-custom";
    expect(getGeminiModel()).toBe("gemini-custom");
  });

  it("uses saved runtime settings before process env values", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_MODEL = "gpt-env";

    saveRuntimeSettings({
      aiProvider: "gemini",
      openAIModel: "gpt-runtime",
      geminiModel: "gemini-runtime",
    });

    expect(getAIProviderName()).toBe("gemini");
    expect(getOpenAIModel()).toBe("gpt-runtime");
    expect(getGeminiModel()).toBe("gemini-runtime");
  });

  it("parses JSON returned inside a markdown code fence", () => {
    expect(parseModelJson('```json\n{"title":"KMP"}\n```')).toEqual({ title: "KMP" });
  });
});
