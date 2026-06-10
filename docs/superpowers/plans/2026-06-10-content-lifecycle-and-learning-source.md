# Content Lifecycle And Learning Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add note deletion, recursive README maintenance, a clear learning-material picker, and editable technology badge recommendations.

**Architecture:** Introduce a repository change planner that applies upserts and deletions to an in-memory snapshot, then generates source, topic, ancestor, and root README changes from the resulting paths. Save and delete APIs share this planner and the same Quick/Review publisher. Studio uses mutually exclusive learning-material modes and structured technology metadata backed by a local badge preset catalog.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Octokit, Zod, Vitest, Testing Library, Playwright, Tailwind CSS.

---

## File Structure

- Create `lib/content/ancestor-readme.ts`: generate managed direct-child indexes for area and root README files.
- Create `lib/content/technology-badges.ts`: normalize technology names, return presets, validate overrides, and render Shields Markdown.
- Create `lib/github/change-planner.ts`: apply requested operations and generate every affected README change.
- Create `components/public/NoteDeleteControl.tsx`: themed deletion modal, mode selection, progress, and result UI.
- Create `app/api/github/delete/route.ts`: validate note deletion requests and call the shared planner and publisher.
- Create `tests/content/ancestor-readme.test.ts`: recursive index generation and legacy-table migration.
- Create `tests/content/technology-badges.test.ts`: preset matching and Markdown rendering.
- Create `tests/github/change-planner.test.ts`: save and delete propagation through every README level.
- Create `tests/public/note-delete-control.test.tsx`: deletion modal behavior and API payloads.
- Create `tests/studio/source-folder-picker.test.tsx`: mutually exclusive picker modes and badge editing.
- Modify `lib/github/types.ts`: replace upsert-only file changes with explicit upsert/delete operations.
- Modify `lib/github/save.ts`: publish both operation types and keep Quick/Review behavior shared.
- Modify `app/api/github/save/route.ts`: delegate README generation to the shared planner.
- Modify `lib/content/source-readme.ts`: support structured technology metadata and badge rendering.
- Modify `components/public/DocumentView.tsx`: show deletion controls only for notes.
- Modify `components/studio/SourceFolderPicker.tsx`: rename source labels, add tabs, and add badge controls.
- Modify `components/studio/StudioWorkspace.tsx`: use structured technology items and intent-oriented path wording.
- Modify `README.md`, `README_ko.md`, and the design specs: document deletion and recursive README behavior.

### Task 1: Model Repository Operations And Publish Deletes

**Files:**
- Modify: `lib/github/types.ts`
- Modify: `lib/github/save.ts`
- Modify: `tests/github/save.test.ts`

- [ ] **Step 1: Write failing publisher tests**

Add tests that mock Octokit and verify both operation variants:

```ts
const changes: RepositoryChange[] = [
  { operation: "upsert", path: "languages/java/README.md", content: "# Java" },
  {
    operation: "delete",
    path: "languages/java/notes/java-intro/note/test.md",
  },
];
```

Assert that upserts call `PUT /repos/{owner}/{repo}/contents/{path}` and deletes call `DELETE /repos/{owner}/{repo}/contents/{path}` with the current blob SHA and selected target branch.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- tests/github/save.test.ts
```

Expected: FAIL because `RepositoryChange` and GitHub deletion publication do not exist.

- [ ] **Step 3: Add explicit operation types**

Replace `FileChange` with:

```ts
export type RepositoryChange =
  | {
      operation: "upsert";
      path: string;
      content: string;
    }
  | {
      operation: "delete";
      path: string;
    };
```

Update `SaveRequest.changes` to use `RepositoryChange[]`.

- [ ] **Step 4: Publish operations sequentially**

In `saveToGitHub`, fetch the current file SHA for each path. For an upsert, retain the existing PUT behavior. For a delete, require an existing SHA and call:

```ts
await octokit.request("DELETE /repos/{owner}/{repo}/contents/{path}", {
  owner,
  repo,
  branch: targetBranch,
  path: change.path,
  message: request.message,
  sha: existingSha,
});
```

Throw a typed not-found error when a deletion target has no SHA.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- tests/github/save.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/github/types.ts lib/github/save.ts tests/github/save.test.ts
git commit -m "feat: publish repository deletions"
```

### Task 2: Generate Recursive Ancestor README Indexes

**Files:**
- Create: `lib/content/ancestor-readme.ts`
- Create: `tests/content/ancestor-readme.test.ts`

- [ ] **Step 1: Write failing ancestor README tests**

Cover:

```ts
const result = upsertAncestorReadme({
  directoryPath: "languages",
  existingContent: "# Languages\n\nProgramming language notes.",
  repositoryPaths: [
    "languages/c/README.md",
    "languages/java/README.md",
    "languages/java/notes/java-intro/note/test.md",
  ],
});
```

Assert that the result preserves prose and contains one managed block with direct links to `c/` and `java/`. Add root coverage for `README.md`, missing README creation, case-insensitive ordering, and removal of the legacy `언어 목록` or `주제 목록` table.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- tests/content/ancestor-readme.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement child discovery**

Export:

```ts
export function ancestorReadmePath(directoryPath: string): string;

export function directChildDirectories(
  directoryPath: string,
  repositoryPaths: string[],
): string[];

export function upsertAncestorReadme(input: {
  directoryPath: string;
  existingContent?: string | null;
  repositoryPaths: string[];
}): string;
```

Use `<!-- til-studio:children:start -->` markers. Ignore `notes`, `theory`, `note`, and `src` as ancestor-index children because those are owned by topic and source README generators.

- [ ] **Step 4: Migrate known legacy child tables**

Before inserting the managed block, remove only recognized navigation sections:

```md
## 언어 목록
| 언어 | 링크 |

## 주제 목록
| 주제 | 설명 | 링크 |
```

Do not remove arbitrary prose or unrelated tables.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- tests/content/ancestor-readme.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/content/ancestor-readme.ts tests/content/ancestor-readme.test.ts
git commit -m "feat: generate recursive readme indexes"
```

### Task 3: Build The Shared Repository Change Planner

**Files:**
- Create: `lib/github/change-planner.ts`
- Create: `tests/github/change-planner.test.ts`
- Modify: `lib/github/save.ts`
- Modify: `tests/github/save.test.ts`

- [ ] **Step 1: Write failing planner tests**

Test an upsert:

```ts
planRepositoryChanges({
  existingPaths: ["README.md", "languages/README.md"],
  requestedChanges: [
    {
      operation: "upsert",
      path: "languages/java/notes/java-intro/note/test.md",
      content: "---\ncreated: 2026-06-10\n---\n\n# Test\n",
    },
  ],
  existingDocuments: {
    "README.md": "# TIL",
    "languages/README.md": "# Languages",
  },
});
```

Assert generated upserts for:

```text
languages/java/notes/java-intro/README.md
languages/java/README.md
languages/README.md
README.md
```

Test a deletion with a paired src and assert that the source README keeps an src-only row. Test deleting the final source path and assert the source disappears from topic and ancestor indexes.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- tests/github/change-planner.test.ts
```

Expected: FAIL because the planner does not exist.

- [ ] **Step 3: Apply requested operations in memory**

Implement:

```ts
export function applyPathOperations(
  existingPaths: string[],
  changes: RepositoryChange[],
): string[];
```

Upserts add paths; deletes remove exact paths. Sort and deduplicate the result.

- [ ] **Step 4: Compute affected README paths**

For every changed note or theory path:

- include its source README when it is a note;
- include its topic README;
- walk from the topic parent to the root and include every ancestor README.

Use the resulting path set, not the pre-change snapshot, when rendering indexes.

- [ ] **Step 5: Generate README upserts bottom-up**

Implement:

```ts
export async function planRepositoryChanges(input: {
  existingPaths: string[];
  requestedChanges: RepositoryChange[];
  readDocument(path: string): Promise<string | null>;
  sourceMetadata?: SourceMetadata;
}): Promise<RepositoryChange[]>;
```

Read existing note contents needed by affected source README files. Generate source README files first, topic README files second, and ancestor README files from deepest to root. Collapse duplicate path changes with the generated README upsert last.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- tests/github/change-planner.test.ts tests/github/save.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/github/change-planner.ts lib/github/save.ts tests/github/change-planner.test.ts tests/github/save.test.ts
git commit -m "feat: plan recursive repository changes"
```

### Task 4: Route Save And Note Deletion Through The Planner

**Files:**
- Modify: `app/api/github/save/route.ts`
- Create: `app/api/github/delete/route.ts`
- Create: `tests/github/delete-route.test.ts`
- Modify: `tests/github/save.test.ts`

- [ ] **Step 1: Write failing route tests**

For delete, submit:

```json
{
  "mode": "review",
  "path": "languages/java/notes/java-intro/note/test.md",
  "message": "Delete TIL note from til-studio"
}
```

Assert that a valid note path reaches the planner and publisher. Assert rejection for theory paths, README paths, traversal segments, and missing snapshot paths.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- tests/github/delete-route.test.ts tests/github/save.test.ts
```

Expected: FAIL because the delete route does not exist and save still builds README changes inline.

- [ ] **Step 3: Simplify the save route**

Parse incoming upserts into:

```ts
{
  operation: "upsert",
  path,
  content,
}
```

Load one snapshot, pass `fetchRepositoryMarkdownDocument` as the planner's reader, and publish the planner output.

- [ ] **Step 4: Add the delete route**

Validate note paths with:

```ts
const notePathPattern =
  /^[^/]+\/[^/]+\/notes\/[^/]+\/note\/[^/]+\.md$/;
```

Reject paths containing `.` or `..` segments. Confirm exact existence in `snapshot.allPaths`, then plan and publish:

```ts
[{ operation: "delete", path: body.path }]
```

- [ ] **Step 5: Return stable error responses**

Return `400` for invalid paths, `404` for missing notes, `409` for stale GitHub deletion targets, and `500` for unexpected publication failures.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- tests/github/delete-route.test.ts tests/github/save.test.ts tests/github/change-planner.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/github/save/route.ts app/api/github/delete/route.ts tests/github/delete-route.test.ts
git commit -m "feat: add note deletion api"
```

### Task 5: Add The Blog Note Deletion Experience

**Files:**
- Create: `components/public/NoteDeleteControl.tsx`
- Create: `tests/public/note-delete-control.test.tsx`
- Modify: `components/public/DocumentView.tsx`

- [ ] **Step 1: Write failing component tests**

Render a note document and assert:

- a `삭제` button is visible;
- theory and README documents do not receive the control;
- opening the control defaults to Review;
- selecting Quick changes the request payload;
- cancel closes without a request;
- Review success renders a pull-request link;
- Quick success indicates redirect to `/blog`.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- tests/public/note-delete-control.test.tsx
```

Expected: FAIL because the control does not exist.

- [ ] **Step 3: Implement the themed modal**

Use a fixed dialog with:

- note title and repository path;
- a segmented Quick/Review selector;
- Review selected by default;
- `취소` and `삭제 요청` buttons;
- progress spinner and themed success/error notice;
- no native `alert`, `confirm`, or `prompt`.

- [ ] **Step 4: Handle success behavior**

For Quick, call `router.push("/blog")` and `router.refresh()`. For Review, retain the page and render the returned `pullRequestUrl` as an external link.

- [ ] **Step 5: Mount only for notes**

In `DocumentView`, render:

```tsx
{document.kind === "note" ? (
  <NoteDeleteControl title={document.title} path={document.path} />
) : null}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- tests/public/note-delete-control.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/public/NoteDeleteControl.tsx components/public/DocumentView.tsx tests/public/note-delete-control.test.tsx
git commit -m "feat: add blog note deletion controls"
```

### Task 6: Add Technology Badge Presets And README Rendering

**Files:**
- Create: `lib/content/technology-badges.ts`
- Create: `tests/content/technology-badges.test.ts`
- Modify: `lib/content/source-readme.ts`
- Modify: `tests/content/source-readme.test.ts`
- Modify: `app/api/github/save/route.ts`

- [ ] **Step 1: Write failing badge tests**

Assert:

```ts
expect(recommendTechnologyBadge("Java")).toEqual({
  name: "Java",
  badge: {
    label: "Java",
    color: "ED8B00",
    logo: "openjdk",
    logoColor: "white",
  },
});
```

Add preset tests for C, C++, JavaScript, TypeScript, Python, HTML5, CSS3, Spring, React, Next.js, Node.js, and Git. Assert unknown values return `{ name }` without a badge.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- tests/content/technology-badges.test.ts tests/content/source-readme.test.ts
```

Expected: FAIL because structured technology metadata is unsupported.

- [ ] **Step 3: Implement presets and URL rendering**

Export:

```ts
export type TechnologyMetadata = {
  name: string;
  badge?: {
    label: string;
    color: string;
    logo: string;
    logoColor: string;
  };
};

export function recommendTechnologyBadge(name: string): TechnologyMetadata;
export function technologyBadgeMarkdown(technology: TechnologyMetadata): string | null;
```

Render:

```md
![Java](https://img.shields.io/badge/Java-ED8B00?logo=openjdk&logoColor=white&style=plastic)
```

Encode label, logo, and logo-color query values. Accept only hexadecimal badge colors without `#`.

- [ ] **Step 4: Preserve backward compatibility**

Allow `SourceMetadata.technologies` to accept structured items and normalize existing string arrays into `{ name }` entries before rendering.

- [ ] **Step 5: Render badges and plain text**

In the source README:

- render badge Markdown on separate lines for items with valid badge settings;
- render `- <name>` for plain-text items;
- omit the section when no technologies exist.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- tests/content/technology-badges.test.ts tests/content/source-readme.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/content/technology-badges.ts lib/content/source-readme.ts app/api/github/save/route.ts tests/content/technology-badges.test.ts tests/content/source-readme.test.ts
git commit -m "feat: generate editable technology badges"
```

### Task 7: Redesign The Learning Material Picker

**Files:**
- Modify: `components/studio/SourceFolderPicker.tsx`
- Modify: `components/studio/StudioWorkspace.tsx`
- Create: `tests/studio/source-folder-picker.test.tsx`
- Modify: `tests/studio/studio-workspace.test.tsx`

- [ ] **Step 1: Write failing picker tests**

Assert that:

- the heading is `학습 자료 선택`;
- `기존 학습 자료` and `새 학습 자료 만들기` act as tabs;
- only the active tab's content is visible;
- selecting an existing material hides creation inputs;
- starting a new material hides existing material buttons;
- adding `Java` inserts the recommended badge;
- editing label, color, logo, and logo color updates the payload;
- disabling a badge keeps the technology as plain text.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- tests/studio/source-folder-picker.test.tsx tests/studio/studio-workspace.test.tsx
```

Expected: FAIL because the existing list and creation controls are displayed together and technologies are a string.

- [ ] **Step 3: Replace source wording and state**

Use:

```ts
export type SourceMetadataForm = {
  type: SourceType | "";
  overview: string;
  technologies: TechnologyMetadata[];
  reference: string;
};
```

Rename user-facing text to `학습 자료`; retain `sourceName` and repository path terminology internally.

- [ ] **Step 4: Add mutually exclusive tabs**

Use a stable two-column segmented control. In existing mode, render only the material list and selected-material status. In creation mode, render only creation fields and technology controls. Animate content with opacity and grid-row transitions without changing fixed control dimensions.

- [ ] **Step 5: Add technology item editing**

Provide:

- technology-name input and add command;
- badge preview;
- editable label, color, logo, and logo-color inputs;
- a badge-enabled toggle;
- a remove icon button with tooltip.

Use the local preset catalog immediately when adding a name.

- [ ] **Step 6: Improve path language**

Replace `저장 source 폴더` and the standalone folder preview with:

```text
이 글이 저장될 위치
languages/java/notes/java-intro/note/example.md
```

Show `폴더 이름: java-intro` as secondary information only while creating.

- [ ] **Step 7: Send structured metadata**

Pass `sourceMetadata.technologies` directly in the save payload. Update empty-state resets to use `technologies: []`.

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm test -- tests/studio/source-folder-picker.test.tsx tests/studio/studio-workspace.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/studio/SourceFolderPicker.tsx components/studio/StudioWorkspace.tsx tests/studio/source-folder-picker.test.tsx tests/studio/studio-workspace.test.tsx
git commit -m "feat: clarify learning material selection"
```

### Task 8: Document, Verify, And Exercise The Full Workflow

**Files:**
- Modify: `README.md`
- Modify: `README_ko.md`
- Modify: `docs/superpowers/specs/2026-06-01-til-studio-design.md`
- Modify: `docs/superpowers/specs/2026-06-10-content-lifecycle-and-learning-source-design.md`
- Modify: `tests/e2e/studio.spec.ts`
- Create: `tests/e2e/note-deletion.spec.ts`

- [ ] **Step 1: Update user documentation**

Document:

- `학습 자료` terminology;
- existing/new material tabs;
- technology badge recommendations and overrides;
- note deletion with Quick/Review;
- recursive README updates through the root;
- the deferred administrator-lock limitation.

- [ ] **Step 2: Add Studio end-to-end coverage**

Extend `tests/e2e/studio.spec.ts` to switch tabs, verify mutual exclusion, add Java and Spring technologies, edit one badge, and confirm the save payload includes structured metadata.

- [ ] **Step 3: Add deletion end-to-end coverage**

Mock the delete endpoint, open a note detail page, choose Review, submit, and verify the pull-request result. Add a Quick scenario that verifies navigation to `/blog`.

- [ ] **Step 4: Run the full unit suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Run lint and build**

Run:

```bash
npm run lint
npm run build
```

Expected: both exit successfully.

- [ ] **Step 6: Run end-to-end tests**

Run:

```bash
npm run test:e2e
```

Expected: all Playwright scenarios pass.

- [ ] **Step 7: Verify the interface visually**

Start the development server, then use the in-app Browser at desktop and mobile widths to verify:

- no overlap in the picker or deletion modal;
- the inactive material mode is absent;
- badge previews fit their containers;
- delete progress and success states are visible;
- article reading remains unobstructed before the delete button is opened.

- [ ] **Step 8: Commit documentation and end-to-end coverage**

```bash
git add README.md README_ko.md docs/superpowers/specs tests/e2e
git commit -m "docs: explain content lifecycle controls"
```

- [ ] **Step 9: Push the completed commits**

```bash
git push origin main
```

Expected: the remote main branch contains the reviewed implementation commits.
