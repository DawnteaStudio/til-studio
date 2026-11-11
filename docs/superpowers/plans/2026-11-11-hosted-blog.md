# Hosted TIL Blog Implementation Plan

**Goal:** Run the existing TIL reader publicly, restrict all administration to the owner's GitHub account, preserve drafts across devices, and deploy to Vercel.

**Approved direction:** The user requested the public blog, owner-only administration, cross-device drafts, and Vercel deployment together. Keep Next.js and the existing GitHub publishing/README workflows. Use Auth.js GitHub OAuth, a numeric owner allowlist (verified account ID 90132183), and private Vercel Blob draft storage with atomic ETag conditional writes. GitHub installation authentication remains separate from visitor authentication.

## Constraints
- No secret values in git, logs, client bundles, or chat. Hosted secrets are environment variables; local settings files are ignored on Vercel.
- Authorize in each management API before parsing or making provider calls; reject cross-origin mutations. Missing auth configuration fails closed on hosted deployments. Local desktop mode remains available only outside hosted mode.
- Public readers cannot change publication scope by editing cookies. Only configured public roots can be read, including direct document URLs.
- Cloud drafts never live in public GitHub branches. Unauthenticated users cannot read/write drafts. Concurrent changes must not silently lose text. Preserve v1 local drafts and provide explicit JSON export/import for localhost migration.
- Test with isolated fake provider data; do not publish test articles to TIL.

## Task 1: Owner authentication
- Add Auth.js OAuth configuration, login/logout, server authorization helpers, hosted fail-closed behavior, management page guards, and guards for all current management APIs.
- Test no-session/wrong-owner rejection, valid owner, config missing, CSRF Origin rejection, and public webhook exclusion.

## Task 2: Cross-device drafts
- Extract the existing v1 StudioDraft schema/merge helpers into a shared module.
- Add authenticated GET/PUT draft API and private Blob storage using ETag CAS, size/schema validation, tombstone resets, idempotent mutation IDs, and no-store responses.
- Extend draft hook with immediate local backup, delayed sequential cloud writes, initial hydration, focus/reconnect refresh, conflict resolution, retry and distinct sync status.
- Add import/export and accessible Korean status/restore actions; wait for hydration before practice-link initialization.
- Test independent browser stores, conflicts, reset/retry behavior, offline recovery and local v1 compatibility.

## Task 3: Public/hosted configuration
- Make hosted settings read-only and env-first; retain local configuration workflow outside hosting.
- Enforce server publication scope before resolving direct documents; hide management actions for visitors and add appropriate owner entry/sign-out navigation.
- Document deploy variables, OAuth callback, migration, verification, and recovery. Preserve current TIL content links.

## Task 4: Integration and deployment
- Install pinned maintained packages; run meaningful unit/integration tests, lint and production build.
- Review full changed diff for authentication bypass, draft loss, secrets and regressions.
- Configure project, private storage, runtime GitHub credentials, OAuth and session secret. Deploy tested commit; verify public pages, denied unauthorized endpoints and owner/cloud draft flow on the hosted URL.
- Commit/push source and synchronize canonical local checkout. Report exact URL and any verification limit truthfully.
