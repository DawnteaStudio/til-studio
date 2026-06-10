# README Cascade Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make lowest-level note add/delete operations keep source, topic, area, and root READMEs consistent while limiting the GitHub Action to source learning-log reconciliation.

**Architecture:** Extend the Studio change planner with safe managed-README removal based on the resulting repository path set and generated-template detection. Narrow the TIL reconciliation script so an existing README receives only a managed learning-log replacement; guidance is created only with a new minimal README. Keep Studio publication atomic and verify the combined behavior with a live GitHub smoke test.

**Tech Stack:** Next.js, TypeScript, Vitest, Node.js test runner, GitHub Actions, Octokit Git Data API.

---

### Task 1: Studio-managed README detection

**Files:**
- Modify: `lib/content/source-readme.ts`
- Modify: `lib/content/topic-readme.ts`
- Modify: `lib/content/ancestor-readme.ts`
- Test: `tests/content/source-readme.test.ts`
- Test: `tests/content/topic-readme.test.ts`
- Test: `tests/content/ancestor-readme.test.ts`

- [ ] **Step 1: Write failing tests for removable generated READMEs**

Add tests that generate each minimal README through the existing upsert function and assert:

```ts
expect(isRemovableSourceReadme({ sourcePath, content })).toBe(true);
expect(isRemovableTopicReadme({ topicPath, content })).toBe(true);
expect(isRemovableAncestorReadme({ directoryPath, content })).toBe(true);
```

Add a sentence outside the managed block and assert each detector returns `false`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- tests/content/source-readme.test.ts tests/content/topic-readme.test.ts tests/content/ancestor-readme.test.ts
```

Expected: FAIL because the removable-README detector exports do not exist.

- [ ] **Step 3: Implement canonical comparison helpers**

Export focused helpers:

```ts
isRemovableSourceReadme(input: {
  sourcePath: string;
  content: string;
}): boolean

isRemovableTopicReadme(input: {
  topicPath: string;
  content: string;
}): boolean

isRemovableAncestorReadme(input: {
  directoryPath: string;
  content: string;
}): boolean
```

Normalize line endings and trailing whitespace. Remove the appropriate managed block, then compare the remaining content with the minimal generated base for that README type. Do not classify README content with additional prose as removable.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused test command from Step 2.

Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/content tests/content
git commit -m "feat: detect removable managed readmes"
```

### Task 2: Studio cascading deletion

**Files:**
- Modify: `lib/github/change-planner.ts`
- Test: `tests/github/change-planner.test.ts`
- Test: `tests/github/delete-route.test.ts`

- [ ] **Step 1: Write a failing final-note cascade test**

Create a repository fixture containing:

```text
README.md
action-chain/topic/README.md
action-chain/topic/notes/source/README.md
action-chain/topic/notes/source/note/note.md
action-chain/README.md
```

Use generated minimal README contents. Request deletion of only the note and assert the planned changes contain:

```ts
{ operation: "delete", path: notePath }
{ operation: "delete", path: sourceReadmePath }
{ operation: "delete", path: topicReadmePath }
{ operation: "delete", path: areaReadmePath }
{ operation: "upsert", path: "README.md", content: expect.notContaining("action-chain") }
```

- [ ] **Step 2: Write a failing preservation test**

Add custom prose outside the topic and area managed blocks. Delete the final note and assert:

```ts
expect(upsertContent(changes, topicReadmePath)).toContain(customTopicProse);
expect(upsertContent(changes, areaReadmePath)).toContain(customAreaProse);
```

The source README remains removable only when it matches the Studio template.

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
npm test -- tests/github/change-planner.test.ts tests/github/delete-route.test.ts
```

Expected: the planner leaves generated source/topic/area READMEs and parent links behind.

- [ ] **Step 4: Implement bottom-up pruning**

In `planRepositoryChanges`:

1. Build the path set after requested changes.
2. Reconcile affected source READMEs.
3. If a source has no `note/` Markdown and no `src/` content, delete its removable README.
4. Recalculate paths before rendering the topic README.
5. If a topic has no notes or theory content, delete its removable README.
6. Recalculate paths before each ancestor level.
7. If a non-root ancestor has no publishable direct children, delete its removable README.
8. Always upsert the root README; never delete it.

Every generated delete must update `resultingPaths` before the parent is rendered.

- [ ] **Step 5: Keep the delete route atomic**

Confirm `app/api/github/delete/route.ts` sends the planner's full delete/upsert set to `saveToGitHub` unchanged. Extend the route test to assert source, topic, area, and root changes are included in one save call.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the focused test command from Step 3.

Expected: all planner and route tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/github/change-planner.ts tests/github
git commit -m "fix: cascade note deletion through readmes"
```

### Task 3: Action learning-log-only reconciliation

**Files in TIL repository:**
- Modify: `scripts/reconcile-source-readmes.mjs`
- Test: `tests/reconcile-source-readmes.test.mjs`

- [ ] **Step 1: Write a failing Studio-format regression test**

Create an existing source README containing Studio's `## 디렉터리 구조`, `## 작성 원칙`, and managed learning-log block. Reconcile it and assert:

```js
assert.equal(count(readme, "## 디렉터리 구조"), 1);
assert.equal(count(readme, "## 작성 원칙"), 1);
assert.match(readme, expectedLearningRow);
```

- [ ] **Step 2: Write a failing no-op test**

Create a Studio-formatted README whose learning log already matches note/src files. Assert:

```js
assert.equal(await reconcileSourceReadme(root, sourceRoot), false);
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
node --test tests/reconcile-source-readmes.test.mjs
```

Expected: Studio wording causes duplicate guidance or a needless rewrite.

- [ ] **Step 4: Restrict existing README changes to the managed block**

Change reconciliation:

```js
const existing = current.trim()
  ? current
  : buildMinimalReadme(path.posix.basename(sourceRoot));
const next = upsertManagedBlock(existing, buildManagedBlock(notes, srcSlugs));
```

Remove `ensureSourceGuidance` from the existing-README path. Keep guidance inside `buildMinimalReadme` so direct GitHub note/src creation still receives a useful new source README.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the focused command from Step 3.

Expected: all reconciliation tests pass and the no-op returns `false`.

- [ ] **Step 6: Commit**

```bash
git add scripts/reconcile-source-readmes.mjs tests/reconcile-source-readmes.test.mjs
git commit -m "fix: limit action to learning log reconciliation"
```

### Task 4: Full local verification

**Files:**
- Verify both repositories.

- [ ] **Step 1: Run all til-studio tests**

```bash
npm test
```

Expected: all Vitest files pass.

- [ ] **Step 2: Run til-studio lint and build**

```bash
npm run lint
npm run build
```

Expected: both commands exit successfully.

- [ ] **Step 3: Run all TIL tests**

```bash
node --test tests/*.test.mjs
```

Expected: all Node tests pass.

- [ ] **Step 4: Validate workflow and diffs**

```bash
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/reconcile-source-readmes.yml')"
git diff --check
```

Expected: both commands exit successfully in TIL; run `git diff --check` in til-studio too.

### Task 5: Publish and live cascade verification

**Files:**
- No permanent fixture files.

- [ ] **Step 1: Push til-studio and TIL commits**

Confirm each repository is clean and ahead only by intended commits, then:

```bash
git push origin main
```

- [ ] **Step 2: Start til-studio and add a lowest-level note**

Use `/api/github/save` in quick mode to create:

```text
action-chain-smoke/topic-smoke/notes/source-smoke/note/note-smoke.md
```

Expected: one Studio commit contains the note plus source, topic, area, and root README changes.

- [ ] **Step 3: Verify the add Action is a no-op**

Wait for `Reconcile source READMEs` to finish.

Expected:

- the Action succeeds;
- no `docs: reconcile source learning logs [skip ci]` commit follows the Studio commit;
- every parent README contains exactly one expected link;
- the source README contains one directory-guidance section and one writing-principles section.

- [ ] **Step 4: Delete the lowest-level note through Studio**

Use `/api/github/delete` in quick mode for the same note.

Expected: one Studio commit deletes the note, source README, topic README, and area README, and removes the area link from root README.

- [ ] **Step 5: Verify the delete Action and cleanup**

Wait for the Action to finish.

Expected:

- the Action succeeds without creating a reconciliation commit;
- no `action-chain-smoke` path remains;
- root README has no `action-chain-smoke` link;
- local and remote `main` match;
- both working trees are clean.
