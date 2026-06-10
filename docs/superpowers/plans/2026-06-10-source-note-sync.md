# Source Note Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize learning sources as `README.md`, `note/`, and `src/`, create and update source README learning logs from til-studio, and reconcile note/src creation order through a GitHub Action in the TIL repository.

**Architecture:** til-studio writes new notes to `notes/<source>/note/<slug>.md` and enriches a save with source README and topic README changes. The TIL repository owns a deterministic Node reconciliation script and workflow that updates only changed source README managed blocks. Existing TIL content is migrated through a review branch with move and link validation.

**Tech Stack:** Next.js 16, TypeScript, Vitest, React Testing Library, GitHub App API, Node.js GitHub Actions

---

## Task 1: Change Note Paths And Metadata

**Files:**
- Modify: `lib/content/paths.ts`
- Modify: `lib/content/note-draft.ts`
- Modify: `lib/content/types.ts`
- Modify: `tests/content/paths.test.ts`
- Modify: `tests/content/note-draft.test.ts`

- [ ] **Step 1: Write failing path and frontmatter tests**

Add expectations equivalent to:

```ts
expect(buildNotePath({
  area: "languages",
  topic: "c",
  source: "hongongC",
  title: "배열과 포인터",
})).toBe("languages/c/notes/hongongc/note/배열과-포인터.md");

expect(draftToNoteMarkdown({
  title: "배열과 포인터",
  created: "2026-06-10",
  source: "혼자 공부하는 C",
  learned: "배열 이름과 포인터의 관계를 배웠다.",
  confused: "",
  questions: "",
  conclusion: "",
  experiments: "",
  parentHref: "../README.md",
})).toContain("---\ncreated: 2026-06-10\n---");
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- tests/content/paths.test.ts tests/content/note-draft.test.ts
```

Expected: path lacks `/note/` and draft lacks `created` frontmatter.

- [ ] **Step 3: Implement the path and metadata**

Change `buildNotePath` to insert `"note"` after the source slug. Add `created` to `StructuredNoteDraft`, and render YAML frontmatter before the parent README link.

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```bash
npm test -- tests/content/paths.test.ts tests/content/note-draft.test.ts
```

Expected: PASS.

## Task 2: Generate Source README Learning Logs

**Files:**
- Create: `lib/content/source-readme.ts`
- Create: `tests/content/source-readme.test.ts`
- Modify: `lib/github/save.ts`
- Modify: `app/api/github/save/route.ts`
- Modify: `tests/github/save.test.ts`

- [ ] **Step 1: Write failing source README tests**

Cover:

```ts
const readme = upsertSourceReadme({
  sourcePath: "languages/c/notes/hongongc",
  metadata: {
    name: "혼자 공부하는 C",
    type: "book",
    overview: "C 문법과 실습을 기록한다.",
    technologies: ["C"],
    references: ["서현우, 혼자 공부하는 C"],
  },
  existingContent: null,
  notes: [{
    path: "languages/c/notes/hongongc/note/array-pointer.md",
    created: "2026-06-10",
    title: "배열과 포인터",
  }],
  srcSlugs: [],
});

expect(readme).toContain("├── note/");
expect(readme).toContain("└── src/");
expect(readme).toContain("| 2026-06-10 | 배열과 포인터 | - | [note](./note/array-pointer.md) |");
```

Also test paired src, src-only learning-log rows, exact-case matching, deterministic ordering, and preservation outside the managed block.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- tests/content/source-readme.test.ts tests/github/save.test.ts
```

Expected: source README module and enriched save changes do not exist.

- [ ] **Step 3: Implement source README generation**

Implement:

```ts
export type SourceMetadata = {
  name: string;
  type: "book" | "lecture" | "mentoring" | "course" | "etc";
  overview?: string;
  technologies?: string[];
  references?: string[];
};

export function sourceReadmePathForNote(path: string): string | null;
export function upsertSourceReadme(input: SourceReadmeInput): string;
```

Use `<!-- til-studio:learning-log:start -->` and `<!-- til-studio:learning-log:end -->` markers. Parse note frontmatter and H1 with the repository's existing Markdown utilities.

- [ ] **Step 4: Enrich GitHub saves**

Extend the save API schema with optional `sourceMetadata`. Fetch the existing source README and note documents needed for the affected source only. Add source README changes before calling `saveToGitHub`.

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
npm test -- tests/content/source-readme.test.ts tests/github/save.test.ts
```

Expected: PASS.

## Task 3: Make Topic README Source-Centered

**Files:**
- Modify: `lib/content/topic-readme.ts`
- Modify: `tests/content/topic-readme.test.ts`

- [ ] **Step 1: Write a failing topic README test**

```ts
expect(readme).toContain("- [hongongc](notes/hongongc/)");
expect(readme).not.toContain("notes/hongongc/note/array-pointer.md");
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm test -- tests/content/topic-readme.test.ts
```

Expected: current implementation lists individual notes.

- [ ] **Step 3: Render one link per source**

Collect the source segment below `notes/`, sort unique sources, and link each source directory. Keep theory document listing unchanged.

- [ ] **Step 4: Run test and verify GREEN**

Run:

```bash
npm test -- tests/content/topic-readme.test.ts
```

Expected: PASS.

## Task 4: Add Source Metadata UI

**Files:**
- Create: `components/studio/SourceFolderPicker.tsx`
- Modify: `components/studio/StudioWorkspace.tsx`
- Modify: `tests/studio/studio-workspace.test.tsx`

- [ ] **Step 1: Write failing source creation UI tests**

Verify a new source requires a source type and supports optional overview, reference, and technology values. Verify existing source selection does not require re-entering metadata. Verify the save payload contains:

```json
{
  "sourceMetadata": {
    "name": "혼자 공부하는 C",
    "type": "book",
    "overview": "C 문법과 실습",
    "technologies": ["C"],
    "references": ["https://example.com/book"]
  }
}
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm test -- tests/studio/studio-workspace.test.tsx
```

Expected: source metadata controls and payload are absent.

- [ ] **Step 3: Implement the source picker**

Move the existing picker from `StudioWorkspace.tsx` into `SourceFolderPicker.tsx`. Add a clear existing/new mode, source type select, and optional metadata fields. Preserve the existing source slug preview.

- [ ] **Step 4: Add Seoul creation date**

When creating the note draft, compute the first-save date with:

```ts
new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
```

Keep the date stable in component state after the first draft/save action.

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
npm test -- tests/studio/studio-workspace.test.tsx
```

Expected: PASS.

## Task 5: Update til-studio Documentation

**Files:**
- Modify: `README.md`
- Modify: `README_ko.md`
- Modify: `docs/superpowers/specs/2026-06-01-til-studio-design.md`

- [ ] **Step 1: Document the final path**

Replace `notes/<source>/<slug>.md` examples with:

```text
notes/<source>/
├── README.md
├── note/<slug>.md
└── src/<slug>/
```

- [ ] **Step 2: Document responsibilities**

State that Studio creates notes and README indexes, while TIL GitHub Actions reconciles code added before or after a note.

- [ ] **Step 3: Verify documentation consistency**

Run:

```bash
rg -n 'notes/<source>/<slug>|/code/' README.md README_ko.md docs/superpowers/specs
```

Expected: no obsolete structural guidance outside historical migration text.

## Task 6: Build TIL Reconciliation Script And Workflow

**Repository:** `DawnteaStudio/TIL`

**Files:**
- Create: `scripts/reconcile-source-readmes.mjs`
- Create: `scripts/reconcile-source-readmes.test.mjs`
- Create: `.github/workflows/reconcile-source-readmes.yml`
- Modify: `package.json` if the repository has one; otherwise use Node's built-in test runner directly

- [ ] **Step 1: Create a branch from the default branch**

Create `feat/source-note-sync` from the current default-branch SHA.

- [ ] **Step 2: Write failing Node tests**

Use temporary directories to cover:

```text
note-first
src-first
paired
src removed
note removed
case mismatch
malformed markers
stable ordering
```

Run:

```bash
node --test scripts/reconcile-source-readmes.test.mjs
```

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement deterministic reconciliation**

Export functions for:

```js
export function parseNote(markdown, filename, fallbackDate);
export function buildLearningLog({ notes, srcSlugs });
export function replaceManagedBlock(readme, block);
export async function reconcileSourceRoot(rootPath);
```

Accept changed paths as command-line arguments or from a newline-delimited file. Derive unique `notes/<source>` roots and inspect only those roots.

- [ ] **Step 4: Add the workflow**

Configure:

```yaml
on:
  push:
    paths:
      - "**/notes/*/note/**"
      - "**/notes/*/src/**"
      - "**/notes/*/README.md"
permissions:
  contents: write
```

Run the script with changed files from the pushed diff. Commit only changed README files using `chore: reconcile source readmes [skip ci]`.

- [ ] **Step 5: Run tests**

Run:

```bash
node --test scripts/reconcile-source-readmes.test.mjs
```

Expected: PASS.

## Task 7: Migrate Existing TIL Sources

**Repository:** `DawnteaStudio/TIL`

**Files:**
- Create: `scripts/migrate-source-layout.mjs`
- Create: `scripts/migrate-source-layout.test.mjs`
- Modify: `templates/template_leaf.md`
- Move: existing `**/notes/*/code/**` to matching `**/notes/*/src/**`
- Move: legacy source-level note Markdown into matching `note/`
- Modify: affected source and topic README files

- [ ] **Step 1: Write migration tests**

Test move planning, collision detection, README link rewriting, Markdown relative asset rewriting, and a generated move manifest.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --test scripts/migrate-source-layout.test.mjs
```

Expected: FAIL because migration helpers do not exist.

- [ ] **Step 3: Implement dry-run migration**

The script first emits a JSON move manifest and fails on destination collisions. It must not delete or overwrite a destination.

- [ ] **Step 4: Review the manifest**

Inspect every `code -> src` and Markdown move. Resolve ambiguous sources manually before apply mode.

- [ ] **Step 5: Apply migration**

Move files, rewrite relative links, update `template_leaf.md`, and run source README reconciliation for every migrated source.

- [ ] **Step 6: Validate links and tests**

Run:

```bash
node --test scripts/reconcile-source-readmes.test.mjs scripts/migrate-source-layout.test.mjs
node scripts/migrate-source-layout.mjs --check-links
```

Expected: all tests pass and link validation reports zero broken local links.

- [ ] **Step 7: Commit and open a draft PR**

Commit with:

```text
refactor: standardize source note layout
```

Open a draft PR explaining the move manifest, compatibility impact, Action behavior, and validation results.

## Task 8: Verify til-studio End To End

**Files:**
- Modify: `tests/e2e/studio.spec.ts`

- [ ] **Step 1: Add an e2e source creation scenario**

Mock or intercept repository APIs and verify:

- a new source can be configured;
- the displayed path includes `/note/`;
- save sends the note, source metadata, and selected mode;
- completion feedback remains visible and dismissible.

- [ ] **Step 2: Run complete verification**

Run:

```bash
npm test
npm run lint
npm run build
npm run test:e2e -- tests/e2e/studio.spec.ts
```

Expected: all commands pass.

- [ ] **Step 3: Commit til-studio implementation**

Use separate commits:

```text
feat: standardize source note structure
feat: generate source learning logs
docs: document source note workflow
```

- [ ] **Step 4: Push til-studio**

Push the verified default branch or approved feature branch to `DawnteaStudio/til-studio`.
