import { z } from "zod";
import { theoryResearchSchema } from "@/lib/ai/schema";

const sourceMetadataSchema = z.object({
  type: z.enum(["", "book", "lecture", "mentoring", "course", "etc"]),
  overview: z.string(),
  technologies: z.array(z.object({
    name: z.string(),
    badge: z.object({
      label: z.string(), color: z.string(), logo: z.string(), logoColor: z.string(),
    }).optional(),
  })),
  reference: z.string(),
});
export const draftSchema = z.object({
  noteDraft: z.object({
    title: z.string(), created: z.string(), source: z.string(), learned: z.string(),
    confused: z.string(), questions: z.string(), conclusion: z.string(),
    experiments: z.string(), parentHref: z.string(),
  }),
  selectedPath: z.string(),
  sourceName: z.string(),
  sourceMetadata: sourceMetadataSchema,
  selectedSourceCodeSlugs: z.array(z.string()),
  isCreatingSource: z.boolean(),
  mode: z.enum(["quick", "review"]),
  draftKind: z.enum(["note", "theory"]),
  activeStep: z.enum(["where", "write", "preview", "publish"]),
  isMarkdownEditing: z.boolean(),
  theoryTitle: z.string(),
  theoryKeyword: z.string(),
  theoryResearch: theoryResearchSchema.nullable(),
  theoryMarkdown: z.string(),
  noteVersion: z.object({ markdown: z.string(), base: z.string() }).nullable(),
  previousLocation: z.object({
    selectedPath: z.string(), sourceName: z.string(), sourceMetadata: sourceMetadataSchema, selectedSourceCodeSlugs: z.array(z.string()),
    isCreatingSource: z.boolean(), draftKind: z.enum(["note", "theory"]),
    mode: z.enum(["quick", "review"]), isMarkdownEditing: z.boolean(),
  }).nullable().default(null),
});
export const recordSchema = z.object({
  version: z.literal(1),
  savedAt: z.number().int().nonnegative(),
  draft: draftSchema,
});

export type StudioDraft = z.infer<typeof draftSchema>;
export type DraftPatch = Partial<StudioDraft> | ((current: StudioDraft) => Partial<StudioDraft>);

export function emptyDraft(created: string): StudioDraft {
  return {
    noteDraft: {
      title: "", created, source: "", learned: "", confused: "", questions: "",
      conclusion: "", experiments: "", parentHref: "../README.md",
    },
    selectedPath: "", sourceName: "",
    sourceMetadata: { type: "", overview: "", technologies: [], reference: "" },
    selectedSourceCodeSlugs: [], isCreatingSource: true, mode: "quick", draftKind: "note",
    activeStep: "write", previousLocation: null, isMarkdownEditing: false, theoryTitle: "", theoryKeyword: "",
    theoryResearch: null, theoryMarkdown: "", noteVersion: null,
  };
}

export function same(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object" || Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(key => Object.hasOwn(b, key) && same(a[key], b[key]));
}

// Apply only fields edited in this tab; keep independent changes from other tabs.
function mergeFields<T extends object>(base: T, local: T, remote: T): T {
  const result = { ...remote };
  for (const key of Object.keys(local) as (keyof T)[]) {
    if (same(local[key], base[key]) || same(local[key], remote[key])) continue;
    if (!same(remote[key], base[key])) throw new Error("Concurrent draft edit");
    result[key] = local[key];
  }
  return result;
}

export function mergeDraft(base: StudioDraft, local: StudioDraft, remote: StudioDraft): StudioDraft {
  const { noteDraft: baseNote, sourceMetadata: baseSource, ...baseFields } = base;
  const { noteDraft: localNote, sourceMetadata: localSource, ...localFields } = local;
  const { noteDraft: remoteNote, sourceMetadata: remoteSource, ...remoteFields } = remote;
  return {
    ...mergeFields(baseFields, localFields, remoteFields),
    noteDraft: mergeFields(baseNote, localNote, remoteNote),
    sourceMetadata: mergeFields(baseSource, localSource, remoteSource),
  };
}


export const maxDraftBytes = 1_000_000;
export const cloudDraftSchema = z.object({
  revision: z.string().min(1).nullable(),
  draft: draftSchema.nullable(),
  updatedAt: z.string().datetime().nullable(),
  mutationId: z.string().min(1).max(128).nullable(),
});
export type CloudDraft = z.infer<typeof cloudDraftSchema>;
export const draftMutationSchema = z.object({
  expectedRevision: z.string().min(1).max(1024).nullable(),
  mutationId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  draft: draftSchema.nullable(),
}).strict();
export type DraftMutation = z.infer<typeof draftMutationSchema>;

export function todayDraft(): StudioDraft {
  return emptyDraft(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()));
}

export function parseDraftImport(raw: string): StudioDraft {
  if (new TextEncoder().encode(raw).length > maxDraftBytes) throw new Error("초안 파일은 1MB 이하로 가져올 수 있습니다.");
  const result = recordSchema.safeParse(JSON.parse(raw));
  if (!result.success) throw new Error("TIL Studio에서 내보낸 초안 JSON 파일을 선택하세요.");
  return result.data.draft;
}

export function exportDraft(draft: StudioDraft): string {
  return JSON.stringify({ version: 1, savedAt: Date.now(), draft: draftSchema.parse(draft) }, null, 2);
}
