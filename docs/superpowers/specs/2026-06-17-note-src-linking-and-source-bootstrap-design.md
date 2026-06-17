# Note Src Linking And Source Bootstrap Design

## Goal

Support book and lecture workflows where source code follows chapter folders such as `ch1` and `ch2`, while notes are written with topic-based slugs.

## Note To Src Linking

Notes may declare related source folders in frontmatter:

```md
---
created: 2026-06-17
src:
  - ch1
  - ch2
---
```

The source README learning log resolves links in this order:

1. If a note has `src` frontmatter, those source folders are linked from that note row.
2. If `src` is absent, the existing automatic rule links `note/<slug>.md` to `src/<slug>/`.
3. A source folder with no linked note appears as a src-only row.
4. A note with no linked source appears as a note-only row.

This makes both source-first and note-first workflows stable. Adding `src/ch1/` after a note already exists links automatically if the note already declares `src: [ch1]`.

## Created Date

Studio must ensure every saved note has `created: YYYY-MM-DD` frontmatter. Existing dates are preserved. Source-only rows remain date-less until a note is linked.

## Source Bootstrap

Studio must allow creating a source workspace before writing a note.

Because Git does not track empty directories, source bootstrap publishes:

- `notes/<source>/README.md`;
- `notes/<source>/note/.gitkeep`;
- `notes/<source>/src/.gitkeep`.

The README has an empty managed learning-log block. Later note and src saves update that README through the normal planner.

## Verification

- Unit tests cover explicit `src` frontmatter, fallback slug matching, src-only rows, and one note linking multiple src folders.
- Studio save tests cover `created` auto-insertion.
- API/UI tests cover source bootstrap without a note.
- TIL Action tests cover the same frontmatter linking rules.
