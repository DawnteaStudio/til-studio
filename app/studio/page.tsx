import { StudioWorkspace } from "@/components/studio/StudioWorkspace";
import { requireAdminPage } from "@/lib/auth/access";
import { isHostedMode } from "@/lib/auth/mode";
import { readSettingsSnapshot } from "@/lib/settings/runtime-settings";

export default async function StudioPage() {
  const identity = await requireAdminPage();
  if (!isHostedMode()) return <StudioWorkspace />;
  const settings = readSettingsSnapshot();
  return <StudioWorkspace cloudDraftKey={`${identity.id}:${settings.repositoryOwner}/${settings.repositoryName}`} />;
}
