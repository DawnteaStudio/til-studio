import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SettingsPanel } from "@/components/studio/SettingsPanel";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("shows hosted settings as read-only and directs the owner to deployment variables", async () => {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => Response.json({
    readOnly: true, aiProvider: "openai", openAIModel: "example", geminiModel: "example",
    repositoryOwner: "author", repositoryName: "TIL", githubAppId: "1", githubInstallationId: "2",
    openAIKeyConfigured: true, geminiKeyConfigured: false, githubPrivateKeyConfigured: true, githubWebhookSecretConfigured: true,
  })));
  const { container } = render(<SettingsPanel isOpen onClose={vi.fn()} />);
  expect(await screen.findByText(/Vercel 프로젝트의 환경변수/)).toBeTruthy();
  expect((container.querySelector("fieldset") as HTMLFieldSetElement).disabled).toBe(true);
  expect(screen.queryByRole("button", { name: "설정 저장" })).toBeNull();
});
