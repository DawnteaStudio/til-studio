# Atomic GitHub Publication Design

## Goal

Prevent til-studio saves and deletions from racing with the TIL README reconciliation workflow, and make learning-log links display the actual src directory and note filename.

## Design

til-studio publishes every requested note and generated README change as one Git commit through the Git Data API. It reads the default-branch commit and tree, creates blobs for upserts, creates one replacement tree containing upserts and deletions, creates one commit, then advances the branch ref once. Review mode creates a branch at that commit and opens a draft pull request.

The TIL reconciliation workflow remains responsible for changes made outside Studio. If its push loses a race, it fetches the latest `main`, resets to it, recalculates the affected source READMEs from the original changed-path list, and retries the commit and push.

Learning-log cells use the linked path's own name:

- src directory `ch2` renders as `[ch2](./src/ch2/)`;
- note file `ch2.md` renders as `[ch2.md](./note/ch2.md)`.

The same rendering rule applies in til-studio, the TIL reconciliation script, the source README template, and existing managed learning-log blocks.

## Error Handling

- A deletion whose path is absent from the base tree returns the existing conflict response.
- A non-fast-forward branch update fails without force-pushing.
- The workflow retries a bounded number of times and fails clearly if another writer continues to advance `main`.

## Verification

- Unit tests prove all changes use one tree, one commit, and one ref update.
- Unit tests prove actual src and note names are rendered.
- TIL reconciliation tests cover note-only, paired, and src-only rows.
- Full til-studio tests, lint, and build pass.
- Full TIL Node tests pass.
