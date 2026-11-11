import { authorizeAdminRequest, getAdminIdentity } from "@/lib/auth/access";
import { isHostedMode } from "@/lib/auth/mode";
import { draftMutationSchema, maxDraftBytes } from "@/lib/content/studio-draft";
import { DraftConflict, readCloudDraft, writeCloudDraft } from "@/lib/drafts/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers });
}

async function owner(request: Request): Promise<string | Response> {
  if (!isHostedMode()) return json({ error: "웹 초안 저장은 호스팅된 Studio에서 사용할 수 있습니다." }, 404);
  const denied = await authorizeAdminRequest(request);
  if (denied) {
    denied.headers.set("Cache-Control", headers["Cache-Control"]);
    return denied;
  }
  const identity = await getAdminIdentity();
  return identity ? String(identity.id) : json({ error: "로그인이 필요합니다." }, 401);
}

export async function GET(request: Request) {
  const id = await owner(request);
  if (id instanceof Response) return id;
  try {
    return json(await readCloudDraft(id));
  } catch {
    return json({ error: "서버 초안을 불러오지 못했습니다. 잠시 뒤 다시 시도하세요." }, 503);
  }
}

export async function PUT(request: Request) {
  const id = await owner(request);
  if (id instanceof Response) return id;
  if (Number(request.headers.get("content-length")) > maxDraftBytes) return json({ error: "초안은 1MB 이하로 저장할 수 있습니다." }, 413);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "저장할 초안을 확인하세요." }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxDraftBytes) {
        await reader.cancel();
        return json({ error: "초안은 1MB 이하로 저장할 수 있습니다." }, 413);
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    const parsed = draftMutationSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return json({ error: "초안 형식과 저장 버전을 확인하세요." }, 400);
    try {
      return json(await writeCloudDraft(id, parsed.data));
    } catch (error) {
      if (error instanceof DraftConflict) return json({ error: error.message, current: error.current }, 409);
      return json({ error: "서버에 저장하지 못했습니다. 이 기기의 내용을 보관한 채 다시 시도하세요." }, 503);
    }
  } catch {
    return json({ error: "초안 JSON 형식을 확인하세요." }, 400);
  } finally {
    reader.releaseLock();
  }
}
