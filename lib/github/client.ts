import { App } from "@octokit/app";

export interface GitHubClientConfig {
  appId: string;
  privateKey: string;
  installationId: string;
}

export function githubConfigFromEnv(): GitHubClientConfig {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const installationId = process.env.GITHUB_INSTALLATION_ID;

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
