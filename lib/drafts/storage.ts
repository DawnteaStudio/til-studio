import { createHash } from "node:crypto";
import { get, put } from "@vercel/blob";
import { z } from "zod";
import { draftSchema, maxDraftBytes, same, type CloudDraft, type DraftMutation } from "@/lib/content/studio-draft";

const storedSchema = z.object({
  version: z.literal(1),
  draft: draftSchema.nullable(),
  mutationId: z.string().min(1).max(128),
  updatedAt: z.string().datetime(),
});

export class DraftConflict extends Error {
  constructor(readonly current: CloudDraft) {
    super("다른 기기에서 초안이 변경되었습니다.");
  }
}

function draftPath(ownerId: string) {
  const scope = JSON.stringify([
    ownerId,
    process.env.TIL_REPOSITORY_OWNER?.trim() || "DawnteaStudio",
    process.env.TIL_REPOSITORY_NAME?.trim() || "TIL",
  ]);
  return "drafts/" + createHash("sha256").update(scope).digest("hex") + ".json";
}

export async function readCloudDraft(ownerId: string): Promise<CloudDraft> {
  const result = await get(draftPath(ownerId), { access: "private", useCache: false });
  if (!result) return { revision: null, draft: null, updatedAt: null, mutationId: null };
  if (result.statusCode !== 200 || !result.blob.etag || result.blob.size > maxDraftBytes) {
    throw new Error("Invalid stored draft");
  }
  const record = storedSchema.parse(await new Response(result.stream).json());
  return { revision: result.blob.etag, draft: record.draft, updatedAt: record.updatedAt, mutationId: record.mutationId };
}

export async function writeCloudDraft(ownerId: string, input: DraftMutation): Promise<CloudDraft> {
  const current = await readCloudDraft(ownerId);
  if (current.mutationId === input.mutationId && same(current.draft, input.draft)) return current;
  if (current.revision !== input.expectedRevision || current.mutationId === input.mutationId) throw new DraftConflict(current);
  const record = { version: 1, draft: input.draft, mutationId: input.mutationId, updatedAt: new Date().toISOString() };
  const body = JSON.stringify(record);
  if (Buffer.byteLength(body, "utf8") > maxDraftBytes) throw new Error("Draft is too large");
  try {
    const result = await put(draftPath(ownerId), body, {
      access: "private", contentType: "application/json", addRandomSuffix: false,
      ...(current.revision === null ? { allowOverwrite: false } : { ifMatch: current.revision }),
    });
    if (!result.etag) throw new Error("Draft revision missing");
    return { revision: result.etag, draft: record.draft, updatedAt: record.updatedAt, mutationId: record.mutationId };
  } catch (error) {
    // Creation races can surface as an already-exists error as well as a failed ETag condition.
    const latest = await readCloudDraft(ownerId);
    if (latest.mutationId === input.mutationId && same(latest.draft, input.draft)) return latest;
    if (latest.revision !== current.revision) throw new DraftConflict(latest);
    throw error;
  }
}
