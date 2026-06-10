# Atomic GitHub Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Studio changes atomically and make TIL learning logs use actual linked file and directory names.

**Architecture:** Replace per-file Contents API writes with one Git Data API tree and commit. Keep the TIL reconciliation Action for non-Studio changes, but make its push retry from the latest remote state. Share the same link-label rule in both repositories.

**Tech Stack:** Next.js, TypeScript, Octokit Git Data API, Vitest, Node test runner, GitHub Actions.

---

### Task 1: Learning-log link labels

**Files:**
- Modify: `lib/content/source-readme.ts`
- Test: `tests/content/source-readme.test.ts`
- Modify in TIL: `scripts/reconcile-source-readmes.mjs`
- Test in TIL: `tests/reconcile-source-readmes.test.mjs`
- Modify in TIL: `templates/template_leaf.md`

- [ ] Write failing assertions that expect `[ch2]` for `src/ch2/` and `[ch2.md]` for `note/ch2.md`.
- [ ] Run the focused tests and confirm they fail on the old `[src]` and `[note]` labels.
- [ ] Render the src slug and note filename as link labels while preserving encoded destinations.
- [ ] Run focused tests and confirm they pass.

### Task 2: Atomic Studio publication

**Files:**
- Modify: `lib/github/save.ts`
- Test: `tests/github/save.test.ts`

- [ ] Replace the publication test with expectations for base commit/tree reads, blob creation, one tree, one commit, and one branch ref write.
- [ ] Run the focused test and confirm the current per-file Contents API implementation fails it.
- [ ] Build tree elements for upserts and deletions, create one commit, and update or create the target ref once.
- [ ] Preserve deletion-not-found validation using the base repository tree.
- [ ] Run focused GitHub tests and confirm they pass.

### Task 3: Workflow race recovery

**Files:**
- Modify in TIL: `.github/workflows/reconcile-source-readmes.yml`

- [ ] Change the commit step to retry up to three times.
- [ ] Before each retry, fetch `origin/main`, reset to it, rerun reconciliation using the original changed-path file, and recreate the commit.
- [ ] Push without force and fail after the bounded retries.

### Task 4: Existing README normalization

**Files:**
- Modify: TIL source `README.md` files containing managed learning logs.

- [ ] Run the reconciliation script for every source root.
- [ ] Verify managed rows use actual directory and filename labels.
- [ ] Confirm prose outside managed markers is unchanged.

### Task 5: Verification and publication

- [ ] Run focused and full til-studio tests.
- [ ] Run til-studio lint and production build.
- [ ] Run all TIL Node tests.
- [ ] Run `git diff --check` in both repositories.
- [ ] Commit til-studio and TIL changes separately using `type: body` messages.
- [ ] Push both repositories after checking their upstream state.
