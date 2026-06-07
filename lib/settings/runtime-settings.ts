import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type AIProviderSetting = "openai" | "gemini";

export type RuntimeSettingsInput = {
  aiProvider?: AIProviderSetting;
  openAIModel?: string;
  openAIKey?: string;
  geminiModel?: string;
  geminiKey?: string;
  repositoryOwner?: string;
  repositoryName?: string;
  githubAppId?: string;
  githubInstallationId?: string;
  githubPrivateKey?: string;
  githubWebhookSecret?: string;
};

type RuntimeSettingsFile = {
  AI_PROVIDER?: string;
  OPENAI_MODEL?: string;
  OPENAI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_API_KEY?: string;
  TIL_REPOSITORY_OWNER?: string;
  TIL_REPOSITORY_NAME?: string;
  GITHUB_APP_ID?: string;
  GITHUB_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_APP_WEBHOOK_SECRET?: string;
};

export type RuntimeSettingsSnapshot = {
  aiProvider: AIProviderSetting;
  openAIModel: string;
  geminiModel: string;
  repositoryOwner: string;
  repositoryName: string;
  githubAppId: string;
  githubInstallationId: string;
  openAIKeyConfigured: boolean;
  geminiKeyConfigured: boolean;
  githubPrivateKeyConfigured: boolean;
  githubWebhookSecretConfigured: boolean;
};

const defaults = {
  aiProvider: "openai" satisfies AIProviderSetting,
  openAIModel: "gpt-4o-mini-2024-07-18",
  geminiModel: "gemini-2.5-flash",
  repositoryOwner: "DawnteaStudio",
  repositoryName: "TIL",
};

const defaultSettingsPath = ".til-studio/settings.local.json";

function testSettingsPath(): string {
  if (process.env.NODE_ENV === "test" && process.env.TIL_STUDIO_SETTINGS_FILE?.trim()) {
    return process.env.TIL_STUDIO_SETTINGS_FILE.trim();
  }

  return defaultSettingsPath;
}

function readSettingsFile(): RuntimeSettingsFile {
  try {
    if (process.env.NODE_ENV === "test") {
      return JSON.parse(readFileSync(testSettingsPath(), "utf8")) as RuntimeSettingsFile;
    }

    return JSON.parse(readFileSync(defaultSettingsPath, "utf8")) as RuntimeSettingsFile;
  } catch {
    return {};
  }
}

function writeSettingsFile(settings: RuntimeSettingsFile) {
  const path = process.env.NODE_ENV === "test" ? testSettingsPath() : defaultSettingsPath;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

function valueFromSettingsOrEnv(name: keyof RuntimeSettingsFile): string | undefined {
  return readSettingsFile()[name]?.trim() || process.env[name]?.trim() || undefined;
}

function configured(name: keyof RuntimeSettingsFile): boolean {
  return Boolean(valueFromSettingsOrEnv(name));
}

function providerName(value: string | undefined): AIProviderSetting {
  return value?.toLowerCase() === "gemini" ? "gemini" : "openai";
}

export function getRuntimeSetting(name: keyof RuntimeSettingsFile): string | undefined {
  return valueFromSettingsOrEnv(name);
}

export function readSettingsSnapshot(): RuntimeSettingsSnapshot {
  return {
    aiProvider: providerName(getRuntimeSetting("AI_PROVIDER")),
    openAIModel: getRuntimeSetting("OPENAI_MODEL") || defaults.openAIModel,
    geminiModel: getRuntimeSetting("GEMINI_MODEL") || defaults.geminiModel,
    repositoryOwner: getRuntimeSetting("TIL_REPOSITORY_OWNER") || defaults.repositoryOwner,
    repositoryName: getRuntimeSetting("TIL_REPOSITORY_NAME") || defaults.repositoryName,
    githubAppId: getRuntimeSetting("GITHUB_APP_ID") || "",
    githubInstallationId: getRuntimeSetting("GITHUB_INSTALLATION_ID") || "",
    openAIKeyConfigured: configured("OPENAI_API_KEY"),
    geminiKeyConfigured: configured("GEMINI_API_KEY"),
    githubPrivateKeyConfigured: configured("GITHUB_APP_PRIVATE_KEY"),
    githubWebhookSecretConfigured: configured("GITHUB_APP_WEBHOOK_SECRET"),
  };
}

function assignValue(settings: RuntimeSettingsFile, key: keyof RuntimeSettingsFile, value: string | undefined) {
  if (value === undefined) return;
  settings[key] = value.trim();
}

function assignSecret(settings: RuntimeSettingsFile, key: keyof RuntimeSettingsFile, value: string | undefined) {
  if (value === undefined) return;
  const trimmed = value.trim();
  if (trimmed) settings[key] = trimmed;
}

export function saveRuntimeSettings(input: RuntimeSettingsInput): RuntimeSettingsSnapshot {
  const settings = readSettingsFile();

  assignValue(settings, "AI_PROVIDER", input.aiProvider);
  assignValue(settings, "OPENAI_MODEL", input.openAIModel);
  assignValue(settings, "GEMINI_MODEL", input.geminiModel);
  assignValue(settings, "TIL_REPOSITORY_OWNER", input.repositoryOwner);
  assignValue(settings, "TIL_REPOSITORY_NAME", input.repositoryName);
  assignValue(settings, "GITHUB_APP_ID", input.githubAppId);
  assignValue(settings, "GITHUB_INSTALLATION_ID", input.githubInstallationId);
  assignSecret(settings, "OPENAI_API_KEY", input.openAIKey);
  assignSecret(settings, "GEMINI_API_KEY", input.geminiKey);
  assignSecret(settings, "GITHUB_APP_PRIVATE_KEY", input.githubPrivateKey);
  assignSecret(settings, "GITHUB_APP_WEBHOOK_SECRET", input.githubWebhookSecret);

  writeSettingsFile(settings);
  return readSettingsSnapshot();
}
