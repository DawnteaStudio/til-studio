# Content Lifecycle And Learning Source Design

## Goal

Make note creation and deletion update every affected README consistently, while making the Studio learning-source flow easier to understand and capable of generating editable technology badges.

## Scope

This work covers:

- deleting a note from its public blog detail page;
- choosing Quick or Review mode for deletion;
- rebuilding source, topic, area, and root README indexes after saves and deletions;
- supporting newly created topics under any area, including newly created top-level areas;
- replacing Studio's user-facing `source` wording with `학습 자료`;
- separating existing-source selection from new-source creation;
- recommending editable technology badges for new learning sources.

Administrator authentication is intentionally deferred. Until that follow-up work is implemented, the delete action is visible on every note detail page.

## Repository Change Planning

Saving and deleting use one shared repository change planner. The planner receives the current repository snapshot plus requested file additions, replacements, and deletions, then computes the resulting path set before generating README changes.

The planner processes indexes from the changed document upward:

1. `notes/<source>/README.md` for a note under a learning source;
2. the topic README containing Notes and Theory entries;
3. each ancestor README containing its direct child sections;
4. the root `README.md` containing top-level areas.

This is recursive and not limited to `languages` or `cs`. For example:

```text
new-area/new-topic/notes/new-source/note/example.md
```

updates:

```text
new-area/new-topic/notes/new-source/README.md
new-area/new-topic/README.md
new-area/README.md
README.md
```

Existing prose outside til-studio managed markers is preserved. If an ancestor README does not exist, Studio creates a minimal standard README with a title, parent link when applicable, and a managed child index.

## Managed README Levels

### Source README

The source learning log is generated from the union of note and src slugs.

- Paired note and src: one row with both links.
- Note only: one row with `-` in the src column.
- Src only: one row with `-` in the note column.
- Deleted note with matching src: retain the src-only row.
- Deleted note without matching src: remove the row.
- Src links display the actual directory name and note links display the actual Markdown filename.

### Topic README

The topic index lists:

- one link per learning source under Notes;
- one link per theory document under Theory.

A source remains listed when it still has a README, note, or src content. A source with no remaining repository paths is removed.

### Ancestor README

Every README above the topic owns a managed direct-child index:

```md
<!-- til-studio:children:start -->
## 하위 항목

- [child-a](child-a/)
- [child-b](child-b/)
<!-- til-studio:children:end -->
```

Only direct child directories represented in the resulting repository path set are listed. Entries are sorted case-insensitively, with the original path spelling preserved.

For existing `languages/README.md`, `cs/README.md`, and the root README, legacy manually maintained child-list tables are migrated into the managed block once so duplicate lists are not retained.

## Note Deletion

The delete button appears only on a note detail page. Theory deletion is outside this scope.

Selecting delete opens a themed confirmation panel that displays:

- the note title and repository path;
- `Review` and `Quick` mode controls;
- Review selected by default;
- a clear statement that related README indexes will be updated;
- cancel and delete commands.

`Review` creates a branch and draft pull request containing the deletion and all README changes. `Quick` commits the same change set directly to the default branch.

The delete API validates that:

- the target is a Markdown note path below `notes/<source>/note/`;
- the target exists in the repository snapshot;
- no arbitrary path outside the note structure can be deleted.

GitHub file deletion uses the current blob SHA. A stale or missing target returns a conflict or not-found response without modifying README files.

After success, the UI shows a themed completion notice. Quick returns to the blog index. Review provides the pull-request link and leaves the original article visible until the PR is merged.

## Studio Learning Material Picker

All user-facing `source` labels become `학습 자료`. Repository folder names and internal type names remain unchanged.

The picker uses two mutually exclusive tabs:

- `기존 학습 자료`;
- `새 학습 자료 만들기`.

When the new-material tab is active, existing materials are not displayed. When the existing-material tab is active, creation fields are not displayed. The selected tab, heading, and status label make the active mode explicit.

The path preview uses intent-oriented wording:

```text
이 글이 저장될 위치
languages/java/notes/java-intro/note/example.md
```

The folder slug remains visible as supporting information rather than the primary label.

## Technology Badge Recommendations

The new-material form accepts technologies as structured items instead of one comma-separated string.

For each entered technology:

1. normalize the name for lookup;
2. match it against a local curated Simple Icons preset;
3. recommend label, background color, logo slug, and logo color;
4. show a badge preview;
5. allow the user to edit label, color, logo, and logo color;
6. allow removing the badge recommendation and keeping plain text.

The first preset set covers common technologies already relevant to the repository, including C, C++, Java, JavaScript, TypeScript, Python, HTML5, CSS3, Spring, React, Next.js, Node.js, and Git.

Unknown technologies remain plain text by default. Studio does not invent a logo slug.

Source metadata stores technology entries in a backward-compatible form:

```ts
type TechnologyMetadata = {
  name: string;
  badge?: {
    label: string;
    color: string;
    logo: string;
    logoColor: string;
  };
};
```

The source README renders recommended badges with `img.shields.io` Markdown and renders unbadged technologies as list items. Badge URL components are encoded before rendering.

## API And GitHub Behavior

Save and delete requests share:

- repository snapshot loading;
- resulting-path calculation;
- recursive README generation;
- Quick and Review GitHub publication behavior.

All requested document and generated README changes are published through one Git tree and one commit. Quick mode advances the default branch once without force; Review mode creates its branch at that single commit.

File changes support explicit operations:

```ts
type RepositoryChange =
  | { operation: "upsert"; path: string; content: string }
  | { operation: "delete"; path: string };
```

README changes are generated after applying requested operations to the in-memory path set. Generated README upserts are appended to the same publication request. Duplicate changes for the same path are collapsed, with generated README content taking the final position.

## Error Handling

- Malformed or duplicated managed markers stop the operation and return a clear error.
- A failed delete never publishes partial README updates.
- A missing ancestor README is created, but an unreadable existing README is not overwritten.
- Unknown technology names remain plain text.
- Quick and Review show the same validation errors in the themed notice system.

## Testing

Unit coverage includes:

- deleting a note removes it from the source learning log;
- deleting a paired note retains the src-only learning row;
- deleting the final note removes empty source and topic entries when no paths remain;
- saving a new topic updates every ancestor README through the root;
- creating a topic under a new top-level area creates each missing README;
- existing ancestor prose is preserved;
- legacy child tables do not remain beside managed child indexes;
- Quick and Review deletion produce the same logical file changes;
- arbitrary delete paths are rejected;
- technology presets recommend badges;
- badge overrides render encoded Shields URLs;
- unknown technologies render as plain text;
- existing and new learning-material modes never display simultaneously.

End-to-end coverage includes:

1. Create a note under a new topic and verify source, topic, area, and root README changes.
2. Open a note detail page, choose Review deletion, and verify the draft PR result.
3. Switch the learning-material picker between existing and new modes.
4. Add Java and Spring technologies, edit a badge, and verify the source README preview and save payload.

## Deferred Work

- administrator authentication and authorization for destructive actions;
- theory deletion;
- deleting an entire source, topic, or area from the UI;
- fetching the full Simple Icons catalog dynamically.
