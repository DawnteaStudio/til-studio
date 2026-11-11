import { redirect } from "next/navigation";
import { authConfigurationReady, configuredAuthOrigin, isAllowedAdminId, safeAdminReturnTo } from "./config";
import { isHostedMode } from "./mode";

export interface AdminIdentity { id: string; name: string }

async function readSession() {
  if (!authConfigurationReady()) return null;
  try {
    const { auth } = await import("@/auth");
    return await auth();
  } catch {
    return null;
  }
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  if (!isHostedMode()) return { id: "local", name: "로컬 관리자" };
  const session = await readSession();
  if (!isAllowedAdminId(session?.user?.id)) return null;
  return { id: session.user.id, name: session.user.name || "관리자" };
}

function denied(status: 401 | 403, message: string): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function authorizeAdminRequest(request: Request): Promise<Response | null> {
  if (!isHostedMode()) return null;
  const session = await readSession();
  if (!session?.user?.id) return denied(401, "관리자 로그인이 필요합니다.");
  if (!isAllowedAdminId(session.user.id)) return denied(403, "이 계정에는 관리자 권한이 없습니다.");
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase()) &&
      request.headers.get("origin") !== configuredAuthOrigin()) {
    return denied(403, "이 사이트에서 시작한 요청만 처리할 수 있습니다.");
  }
  return null;
}

export async function requireAdminPage(returnTo = "/studio"): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/login?callbackUrl=" + encodeURIComponent(safeAdminReturnTo(returnTo)));
  return identity;
}
