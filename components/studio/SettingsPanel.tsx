"use client";

import { useEffect, useState } from "react";

type SettingsSnapshot = {
  aiProvider: "openai" | "gemini";
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

type SettingsForm = SettingsSnapshot & {
  openAIKey: string;
  geminiKey: string;
  githubPrivateKey: string;
  githubWebhookSecret: string;
};

const emptySettings: SettingsForm = {
  aiProvider: "openai",
  openAIModel: "gpt-4o-mini-2024-07-18",
  geminiModel: "gemini-2.5-flash",
  repositoryOwner: "DawnteaStudio",
  repositoryName: "TIL",
  githubAppId: "",
  githubInstallationId: "",
  openAIKeyConfigured: false,
  geminiKeyConfigured: false,
  githubPrivateKeyConfigured: false,
  githubWebhookSecretConfigured: false,
  openAIKey: "",
  geminiKey: "",
  githubPrivateKey: "",
  githubWebhookSecret: "",
};

function formFromSnapshot(snapshot: SettingsSnapshot): SettingsForm {
  return {
    ...snapshot,
    openAIKey: "",
    geminiKey: "",
    githubPrivateKey: "",
    githubWebhookSecret: "",
  };
}

function secretStatus(label: string, configured: boolean) {
  return `${label} ${configured ? "저장됨" : "미설정"}`;
}

export function SettingsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose(): void;
}) {
  const [form, setForm] = useState<SettingsForm>(emptySettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadSettings() {
      setIsLoading(true);
      setStatus("");
      try {
        const response = await fetch("/api/settings");
        if (!response.ok) throw new Error("settings load failed");
        const snapshot = (await response.json()) as SettingsSnapshot;
        if (isMounted) setForm(formFromSnapshot(snapshot));
      } catch {
        if (isMounted) setStatus("설정을 불러오지 못했습니다");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function update<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    setIsSaving(true);
    setStatus("설정 저장 중");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          aiProvider: form.aiProvider,
          openAIModel: form.openAIModel,
          openAIKey: form.openAIKey,
          geminiModel: form.geminiModel,
          geminiKey: form.geminiKey,
          repositoryOwner: form.repositoryOwner,
          repositoryName: form.repositoryName,
          githubAppId: form.githubAppId,
          githubInstallationId: form.githubInstallationId,
          githubPrivateKey: form.githubPrivateKey,
          githubWebhookSecret: form.githubWebhookSecret,
        }),
      });
      if (!response.ok) throw new Error("settings save failed");
      const snapshot = (await response.json()) as SettingsSnapshot;
      setForm(formFromSnapshot(snapshot));
      setStatus("설정 저장 완료");
    } catch {
      setStatus("설정 저장 실패");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#0d0f0b]/70 px-4 py-6 backdrop-blur-sm">
      <section className="mx-auto flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#3b4031] bg-[#1d2118] text-[#f4efe4] shadow-[0_24px_70px_rgba(0,0,0,0.48)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#303628] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9cab82]">Runtime</p>
            <h2 className="mt-1 text-2xl font-semibold">설정</h2>
            <p className="mt-2 text-sm leading-6 text-[#b9b19f]">
              저장된 secret은 다시 표시하지 않고, 설정 여부만 보여줍니다.
            </p>
          </div>
          <button
            type="button"
            aria-label="설정 닫기"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2a2f22] text-[#d8d0bd] transition hover:bg-[#363d2d] hover:text-[#f4efe4]"
          >
            ×
          </button>
        </div>

        <div className="overflow-auto px-5 py-5">
          {isLoading ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[#2a2f22] px-4 py-3 text-sm text-[#d8d0bd]">
              <span className="size-4 animate-spin rounded-full border-2 border-[#d8c69a] border-t-transparent" />
              설정을 불러오는 중
            </div>
          ) : null}

          <div className="grid gap-5">
            <section className="rounded-3xl bg-[#171b14] p-4">
              <h3 className="text-sm font-semibold text-[#f3ecd8]">AI</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[#d8d0bd]">AI provider</span>
                  <select
                    value={form.aiProvider}
                    onChange={(event) => update("aiProvider", event.target.value as SettingsForm["aiProvider"])}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#d8c69a]/20"
                  >
                    <option value="openai">openai</option>
                    <option value="gemini">gemini</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[#d8d0bd]">OpenAI model</span>
                  <input
                    value={form.openAIModel}
                    onChange={(event) => update("openAIModel", event.target.value)}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[#d8d0bd]">Gemini model</span>
                  <input
                    value={form.geminiModel}
                    onChange={(event) => update("geminiModel", event.target.value)}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="flex items-center justify-between gap-2 font-medium text-[#d8d0bd]">
                    OpenAI API key
                    <span className="text-xs text-[#9cab82]">
                      {secretStatus("OpenAI API key", form.openAIKeyConfigured)}
                    </span>
                  </span>
                  <input
                    aria-label="OpenAI API key"
                    type="password"
                    value={form.openAIKey}
                    onChange={(event) => update("openAIKey", event.target.value)}
                    placeholder={form.openAIKeyConfigured ? "새 key를 입력하면 교체됩니다" : "OpenAI API key"}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none placeholder:text-[#827a69] focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm md:col-span-2">
                  <span className="flex items-center justify-between gap-2 font-medium text-[#d8d0bd]">
                    Gemini API key
                    <span className="text-xs text-[#9cab82]">
                      {secretStatus("Gemini API key", form.geminiKeyConfigured)}
                    </span>
                  </span>
                  <input
                    aria-label="Gemini API key"
                    type="password"
                    value={form.geminiKey}
                    onChange={(event) => update("geminiKey", event.target.value)}
                    placeholder={form.geminiKeyConfigured ? "새 key를 입력하면 교체됩니다" : "Gemini API key"}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none placeholder:text-[#827a69] focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl bg-[#171b14] p-4">
              <h3 className="text-sm font-semibold text-[#f3ecd8]">GitHub</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[#d8d0bd]">Repository owner</span>
                  <input
                    value={form.repositoryOwner}
                    onChange={(event) => update("repositoryOwner", event.target.value)}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[#d8d0bd]">Repository name</span>
                  <input
                    value={form.repositoryName}
                    onChange={(event) => update("repositoryName", event.target.value)}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[#d8d0bd]">GitHub App ID</span>
                  <input
                    value={form.githubAppId}
                    onChange={(event) => update("githubAppId", event.target.value)}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[#d8d0bd]">GitHub installation ID</span>
                  <input
                    value={form.githubInstallationId}
                    onChange={(event) => update("githubInstallationId", event.target.value)}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm md:col-span-2">
                  <span className="flex items-center justify-between gap-2 font-medium text-[#d8d0bd]">
                    GitHub private key
                    <span className="text-xs text-[#9cab82]">
                      {secretStatus("GitHub private key", form.githubPrivateKeyConfigured)}
                    </span>
                  </span>
                  <input
                    aria-label="GitHub private key"
                    type="password"
                    value={form.githubPrivateKey}
                    onChange={(event) => update("githubPrivateKey", event.target.value)}
                    placeholder={form.githubPrivateKeyConfigured ? "새 private key를 입력하면 교체됩니다" : "GitHub private key"}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none placeholder:text-[#827a69] focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm md:col-span-2">
                  <span className="flex items-center justify-between gap-2 font-medium text-[#d8d0bd]">
                    GitHub webhook secret
                    <span className="text-xs text-[#9cab82]">
                      {secretStatus("GitHub webhook secret", form.githubWebhookSecretConfigured)}
                    </span>
                  </span>
                  <input
                    aria-label="GitHub webhook secret"
                    type="password"
                    value={form.githubWebhookSecret}
                    onChange={(event) => update("githubWebhookSecret", event.target.value)}
                    placeholder={form.githubWebhookSecretConfigured ? "새 secret을 입력하면 교체됩니다" : "GitHub webhook secret"}
                    className="h-11 rounded-2xl bg-[#2a2f22] px-3 text-[#f4efe4] outline-none placeholder:text-[#827a69] focus:ring-4 focus:ring-[#d8c69a]/20"
                  />
                </label>
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#303628] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-h-5 text-sm text-[#b9b19f]">{status}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-[#2a2f22] px-4 py-2.5 text-sm font-semibold text-[#d8d0bd] transition hover:bg-[#363d2d]"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={saveSettings}
              disabled={isSaving}
              className="rounded-2xl bg-[#d8c69a] px-4 py-2.5 text-sm font-semibold text-[#1e2118] transition hover:bg-[#e5d3a5] disabled:opacity-60"
            >
              {isSaving ? "저장 중" : "설정 저장"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
