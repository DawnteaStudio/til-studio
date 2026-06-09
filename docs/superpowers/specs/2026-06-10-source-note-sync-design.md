# Source Note Sync Design

## Goal

Standardize every learning source under `notes/` around `README.md`, `note/`, and `src/`, then keep the source README accurate regardless of whether a note or its practice code is created first.

This design covers two repositories:

- `til-studio`: creates notes and source README files using the standard structure.
- `DawnteaStudio/TIL`: contains the content, migration changes, templates, and GitHub Actions reconciliation workflow.

## Standard Directory Structure

Every book, lecture, course, mentoring series, or miscellaneous learning source uses:

```text
<area>/<topic>/notes/<source>/
├── README.md
├── note/
│   └── <slug>.md
└── src/
    └── <slug>/
        └── source files
```

Rules:

- A written learning record is stored at `note/<slug>.md`.
- Practice code for that record is stored below `src/<slug>/`.
- `note/<slug>.md` and `src/<slug>/` form a pair only when their slugs match exactly.
- A note or src folder may exist without its pair.
- Source folder names remain stable during migration unless a rename is independently required.
- Git does not retain empty directories, so `note/` and `src/` appear when their first tracked file is created.

`src/` is used instead of language-specific or legacy names such as `code/`. The name remains valid for C, Java, JavaScript, multi-file examples, and future languages.

## Source README

`notes/<source>/README.md` is the guide and index for one learning source. The existing `hongongC` README is the content reference, generalized for all source types.

Each source README contains:

1. A link to the topic README.
2. Source title and type, such as book, lecture, mentoring, or etc.
3. A short overview.
4. The standard directory structure.
5. Writing rules.
6. Languages or technologies, when provided.
7. A managed learning log.
8. References, when provided.

User-written overview, technology, and reference sections remain editable. Studio and GitHub Actions modify only explicitly marked managed blocks.

### Directory And Writing Rules

The README includes this structure:

```text
<source>/
├── README.md
├── note/    # 학습 기록 Markdown
└── src/     # note와 같은 slug를 사용하는 실습 코드
```

It also states:

- Use one stable slug for the same learning unit.
- Write the record at `note/<slug>.md`.
- Put related practice files under `src/<slug>/`.
- Do not commit generated output such as `build/`, `.gradle/`, `node_modules/`, binaries, IDE caches, or package caches.
- A note does not require src, and src does not require a note.
- The README learning log is generated and must not be edited manually inside its managed block.

## Managed Learning Log

The source README contains one replaceable block:

```md
<!-- til-studio:learning-log:start -->
## 학습 기록

| 날짜 | 학습 내용 | 소스 코드 | 노트 |
| --- | --- | --- | --- |
| 2026-06-10 | 배열과 포인터 | [src](./src/array-pointer/) | [note](./note/array-pointer.md) |

## 연결 대기

- [collections](./src/collections/) - 대응하는 note가 없습니다.
<!-- til-studio:learning-log:end -->
```

Reconciliation rules:

- Note and src both exist: add one learning-log row with both links.
- Note only: add one learning-log row with `-` in the source-code column.
- Src only: list it under `연결 대기`.
- When a pair is completed, remove the src entry from `연결 대기` and render the complete row.
- When src is removed, retain the note row and change its source-code column to `-`.
- When a note is removed but src remains, remove its learning-log row and add the src entry to `연결 대기`.
- Sort learning-log rows by date ascending, then slug ascending.
- Sort pending src entries by slug ascending.
- Do not infer matches from similar names. Only exact slug matches are automatic.

### Date And Title Rules

The note is the source of truth for learning-log metadata.

New notes created by Studio include frontmatter:

```yaml
---
created: 2026-06-10
---
```

- `created` uses the Asia/Seoul calendar date at the first Studio save.
- Later src linking does not change the date.
- Existing notes without `created` use the date already present in their source README learning log when migration can identify it.
- If migration cannot identify a date, use the note file's most recent Git commit date.
- The learning title comes from the first Markdown H1.
- If no H1 exists, derive a readable title from the note filename.

GitHub Actions does not modify note content merely to add missing metadata. Migration may add frontmatter to existing notes when necessary to preserve a known learning date.

## Studio Behavior

### Note Creation

Studio writes new notes to:

```text
<area>/<topic>/notes/<source>/note/<slug>.md
```

Studio does not upload or edit source code.

When saving a note, Studio includes these changes in the same Quick commit or Review PR:

- the note file;
- the source README, creating it when the source is new;
- the source README learning-log managed block;
- the topic README managed index.

If `src/<slug>/` is already present in the repository tree loaded for the current Studio session, Studio may include its link immediately. Studio must not perform an additional repository-wide scan solely to find src.

### New Source Creation

The source creation UI collects:

- source name: required;
- source type: required, with book, lecture, mentoring, course, and etc options;
- overview: optional;
- reference URL or citation: optional;
- languages or technologies: optional.

On the first note save for a new source, Studio creates `notes/<source>/README.md` from the standard source README template. Empty `note/` or `src/` directories are not created with placeholder files.

### Existing Source Selection

Studio recognizes a source folder when it finds:

- `notes/<source>/README.md`;
- files under `notes/<source>/note/`;
- legacy note files during the migration compatibility period.

After migration is complete, new writes always use `note/` and `src/`.

## GitHub Actions Reconciliation

The TIL repository owns a workflow that reconciles changes made outside Studio.

The workflow runs on pushes to managed branches, including pull-request merge commits, when the pushed diff changes:

```text
**/notes/*/note/**
**/notes/*/src/**
**/notes/*/README.md
```

The workflow:

1. Determines only the changed `notes/<source>/` roots.
2. Reads note filenames, note metadata, H1 titles, and src directory names within those roots.
3. Rebuilds the managed learning-log block deterministically.
4. Preserves all README content outside the managed block.
5. Commits changed README files with a message containing `[skip ci]`.
6. Does nothing when reconciliation produces no content change.

The workflow must not scan file contents across the entire repository. It may use the Git diff to identify source roots and inspect only those directories.

The reconciliation logic lives in a testable script rather than inline shell. The workflow invokes that script.

## Topic README Behavior

The topic README continues to list sources and theory documents.

For Notes, the topic README links to each source README rather than listing every note directly:

```md
## Notes

- [hongongC](./notes/hongongC/)
- [APSS](./notes/APSS/)
```

This keeps topic-level navigation concise while the source README owns its detailed learning log.

## Existing Content Migration

Migration is performed in the TIL repository through a dedicated review PR.

For every source folder:

- Rename `code/` to `src/`.
- Keep existing `note/` directories.
- Move Markdown learning records stored directly below the source folder into `note/`.
- Move Markdown learning records in other legacy note directories into `note/` when their purpose is unambiguous.
- Preserve non-note assets needed by Markdown documents and update relative links after moves.
- Update source README links from `./code/` to `./src/`.
- Replace source README learning-log sections with the managed block.
- Add or update the directory structure and writing rules.
- Update `templates/template_leaf.md` to use `README.md`, `note/`, and `src/`.
- Update topic README links to point to source README folders.

Before moving a file, migration checks for destination collisions. A collision stops automatic migration for that source and reports it for manual resolution.

Historical links may break when files move. The migration PR must include a generated move manifest and link-validation results so every changed relative link can be reviewed.

## Failure Handling

- Missing source README: Studio creates it during note save; Actions creates it from a minimal template only when reconciling a source changed outside Studio.
- Invalid note frontmatter: retain the note, derive available metadata, and report a workflow warning.
- Duplicate slug within `note/`: impossible at one filesystem path; case-only conflicts are treated as errors.
- Case mismatch between note and src slug: do not pair them and report a warning because GitHub paths are case-sensitive.
- README markers are malformed or duplicated: do not overwrite the README; fail reconciliation with a clear error.
- GitHub Actions lacks write permission: upload the proposed README patch as an artifact and fail with guidance.

## Testing

til-studio tests cover:

- note paths use `notes/<source>/note/<slug>.md`;
- source README creation for a new source;
- source README learning-log generation for note-only and paired note/src cases;
- existing README prose is preserved;
- topic README links to source README folders;
- source creation fields and save payload;
- no additional full-tree request is made during note save.

TIL repository tests cover:

- note-first, src-first, paired, removed-note, and removed-src reconciliation;
- deterministic ordering;
- exact-slug and case-sensitive matching;
- metadata date and H1 title extraction;
- README managed-block replacement and prose preservation;
- malformed marker failure;
- legacy `code/` to `src/` migration;
- moved Markdown relative-link rewriting;
- destination collision detection.

End-to-end verification covers:

1. Create a new source and note in Studio.
2. Verify source README and topic README changes in the GitHub save.
3. Push matching src later and verify Actions adds the src link.
4. Push src first, verify the pending entry, then add the matching note and verify the complete row.
