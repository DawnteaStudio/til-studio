import { App } from "@octokit/app";
import { getRuntimeSetting } from "@/lib/settings/runtime-settings";

export interface GitHubClientConfig {
  appId: string;
  privateKey: string;
  installationId: string;
}

export function githubConfigFromEnv(): GitHubClientConfig {
  const appId = getRuntimeSetting("GITHUB_APP_ID");
  const privateKey = getRuntimeSetting("GITHUB_APP_PRIVATE_KEY")?.replace(/\\n/g, "\n");
  const installationId = getRuntimeSetting("GITHUB_INSTALLATION_ID");

  if (!appId || !privateKey || !installationId) {
    throw new Error("GitHub App environment variables are missing");
  }

  return { appId, privateKey, installationId };
}

export type InstallationOctokit = Awaited<ReturnType<App["getInstallationOctokit"]>>;

export async function createInstallationOctokit(
  config = githubConfigFromEnv(),
): Promise<InstallationOctokit> {
  const app = new App({
    appId: config.appId,
    privateKey: config.privateKey,
  });

  return app.getInstallationOctokit(Number(config.installationId));
}
