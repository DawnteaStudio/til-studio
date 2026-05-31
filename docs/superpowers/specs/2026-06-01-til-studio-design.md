# til-studio Design

Date: 2026-06-01

## Purpose

til-studio is a personal study workspace and public TIL site built around the `DawnteaStudio/TIL` GitHub repository.

The TIL repository remains the source of truth for Markdown content. til-studio provides a browser-based studio for choosing a repository location, writing study notes, using AI to organize notes, saving changes to GitHub, and rendering the same repository as a public blog and learning map.

## Product Principles

- The TIL repo is the canonical content store.
- The app helps the user write into the existing repo structure instead of inventing a separate content model.
- `notes` and `theory` have different purposes and should not be blurred.
- AI assists the user's writing and organization, but the user decides final paths, titles, generated files, and GitHub writes.
- `coding-test` remains separate from ordinary CS/language study content.
- The design should stay simple and quiet, with the repository structure visible rather than hidden.

## Repository Model

The target content structure is:

```text
TIL/
├── cs/
│   └── <topic>/
│       ├── README.md
│       ├── theory/
│       └── notes/
├── languages/
│   └── <language>/
│       ├── README.md
│       ├── theory/
│       └── notes/
├── coding-test/
├── projects/
└── README.md
```

`coding-test` is shown as its own area and is not mixed into general `cs` notes or theory.

## Content Semantics

### notes

`notes` stores study-process records written while taking a lecture, reading a book, experimenting, or learning a topic.

Notes should preserve:

- learning source
- what was learned
- confusing points
- things to verify
- current understanding
- experiments or follow-up questions when useful
- the user's thought process at study time

The default note template is:

```md
# <topic title>

[상위로 이동](../README.md)

## 목차

- [학습 출처](#학습-출처)
- [오늘 배운 것](#오늘-배운-것)
- [헷갈린 점](#헷갈린-점)
- [확인하고 싶은 것](#확인하고-싶은-것)
- [현재 이해한 결론](#현재-이해한-결론)

## 학습 출처

## 오늘 배운 것

## 헷갈린 점

## 확인하고 싶은 것

## 현재 이해한 결론
```

Core sections are included by default. Optional sections such as `실험 결과`, `느낀 점`, `추가 질문`, and `관련 링크` can be enabled when needed.

### theory

`theory` stores refined concept documents for review, reference, interviews, and later lookup.

Theory documents should be:

- concept-centered rather than source-centered
- more conclusive than exploratory
- reusable as a personal reference
- allowed to synthesize multiple notes
- linked back to relevant notes when useful

The default theory template is:

```md
# <concept title>

[상위로 이동](../README.md)

## 목차

- [개념](#개념)
- [핵심 내용](#핵심-내용)
- [주의할 점](#주의할-점)
- [관련 notes](#관련-notes)

## 개념

## 핵심 내용

## 주의할 점

## 관련 notes
```

## Studio Flow

The main writing flow is location-first:

1. Select a repository area such as `cs`, `languages`, or `projects`.
2. Select a topic folder such as `algorithms`, `spring`, or `javascript`.
3. Select or create a source folder under `notes`, using only a simple folder name.
4. Create a topic-based note file.
5. Write raw study thoughts into the note.
6. Use AI to organize the note into the default template.
7. Let AI check for missing sections.
8. Optionally look up related theory by keywords.
9. Optionally create a theory document after lookup.
10. Save to GitHub using Quick Save or Review Save.

The note file unit is chapter/topic based, not daily. Examples:

```text
cs/algorithms/notes/inflearn-algorithm/01-time-complexity.md
cs/algorithms/notes/inflearn-algorithm/02-sorting.md
cs/spring/notes/inflearn-spring-db/transactional-rollback.md
```

## Studio UI

The writing screen uses a workspace layout:

- left panel: repository location and folder tree
- center panel: Markdown editor and preview
- right panel: AI actions, theory lookup, save controls

The app is not a generic note app. It is a repository-aware writing studio.

Required MVP actions:

- select existing folder
- create new folder
- create topic note file
- generate note template
- generate table of contents and parent navigation
- run AI note cleanup
- run missing-section check
- edit the final Markdown before saving
- Quick Save
- Review Save

## AI Scope

AI is included in MVP, but with constrained authority.

MVP AI actions:

- `notes 형식으로 다듬기`: organize rough study text into the notes template while preserving learning context.
- `빠진 섹션 찾기`: identify missing source, confusing points, verification items, or conclusions and ask the user for more input.
- `theory 키워드 조회`: suggest keywords and candidate theory titles from the current note.
- `theory 새 문서 생성`: after keyword lookup and user approval, create a simple theory document.

AI does not silently publish content. The user must approve final title, path, content, and save mode.

## Theory Lookup And Creation

Theory creation in MVP is lookup-first.

Flow:

1. Extract candidate keywords from the current note.
2. Let the user edit the query.
3. Search the theory index.
4. Show matching existing theory files.
5. Let the user choose:
   - link the note to an existing theory
   - update an existing theory later
   - create a new theory file
   - ignore for now
6. If creating a new theory file, use a simple theory template and link the originating note.

The initial search index should use file path, title, headings, tags/frontmatter if present, and text keywords. Semantic duplicate detection is deferred.

## GitHub Save Modes

til-studio supports two save modes.

### Quick Save

Quick Save commits directly to `main`.

Use it by default for ordinary notes, small edits, and personal study records.

### Review Save

Review Save creates a branch and pull request.

Use it by default for theory files, README updates, structural changes, large edits, or any change that affects navigation/indexing broadly.

The user can override the suggested mode.

## Public Site

The public site renders the TIL repository as a simple blog and learning map.

MVP public views:

- recent documents
- folder/category browsing
- document detail page
- repository-structure learning map

The document detail page includes:

- rendered Markdown
- table of contents
- parent navigation
- link back to GitHub source

## Learning Map

The learning map follows the GitHub repository structure exactly.

Example:

```text
TIL
└── cs
    └── algorithms
        ├── theory
        │   └── KMP.md
        └── notes
            └── inflearn-algorithm
                └── sorting.md
```

Folders are major nodes. Markdown files are leaf nodes. No separate `notes` or `theory` visual badges are required because the folder names already communicate the distinction.

## Synchronization

The app supports bidirectional GitHub sync.

From til-studio to GitHub:

- user edits Markdown in the studio
- app writes to the TIL repo through GitHub
- content is saved by Quick Save or Review Save
- public index refreshes after commit or merge

From GitHub to til-studio:

- user edits files directly on GitHub or locally pushes changes
- GitHub webhook notifies til-studio
- til-studio rebuilds the content index
- public blog and learning map update

A manual sync button is also available for recovery and explicit refreshes.

## App Data

The app database should not become the primary content store.

It may store:

- GitHub connection settings
- selected TIL repository
- user preferences
- draft state before GitHub save
- cached content index
- cached theory search index
- webhook processing state

Markdown content belongs in the TIL repo.

## Architecture

Recommended first implementation:

- separate repository: `DawnteaStudio/til-studio`
- web app, not desktop app
- public site plus authenticated `/studio`
- Next.js full-stack app
- GitHub App integration for repository reads, writes, branch creation, PR creation, and webhooks
- OpenAI-powered AI actions behind server routes
- repository indexer for Markdown tree, headings, links, and theory keywords
- hosted web app with managed environment variables and webhook endpoint

Core modules:

- GitHub integration: read tree, read file, write file, branch, PR, webhook
- Content indexer: parse repository tree and Markdown metadata
- Studio editor: folder picker, Markdown editor, AI actions, save controls
- Theory index: keyword search across theory documents
- Public renderer: blog list, document detail, learning map
- AI service: note cleanup, missing-section check, keyword/title suggestions

## MVP Scope

Included:

- GitHub login and TIL repo connection
- repository folder tree browsing
- existing folder selection and new folder creation
- topic-based notes file creation
- notes template generation
- table of contents and parent navigation generation
- AI note cleanup
- AI missing-section check
- theory keyword lookup
- user-approved theory document creation
- Quick Save and Review Save
- webhook sync from GitHub to til-studio
- manual sync button
- public blog list
- public document page
- repository-structure learning map

Deferred:

- AI-generated theory synthesis from many notes
- advanced semantic duplicate detection
- full source/course metadata cards
- progress statistics
- constellation-style relationship map
- offline-first PWA writing
- multi-user/team support

## Error Handling

The app should handle:

- GitHub auth expiration by asking the user to reconnect
- write conflicts by showing the latest remote version and asking whether to merge manually or save as a new branch
- webhook failures by exposing manual sync
- AI failures by preserving the user's raw draft and allowing manual editing
- missing or renamed folders by asking the user to reselect a target path
- duplicate file names by suggesting a new slug

## Testing Strategy

MVP tests should cover:

- Markdown template generation
- parent navigation and table of contents generation
- repository tree parsing
- theory keyword index generation
- file path and slug creation
- GitHub save mode decisions
- webhook-triggered index refresh
- AI action contracts with mocked model responses
- public route rendering for notes, theory, and nested folders

End-to-end tests should cover:

- select folder, create note, save with Quick Save
- create note, run missing-section check, edit, save
- run theory lookup, create theory, save with Review Save
- simulate GitHub webhook and verify public map refresh

## Implementation Defaults

- Framework: Next.js.
- Repository integration: GitHub App, because the app needs webhooks plus controlled read/write access to a specific repo.
- Hosting: any platform that can host a Next.js app with server routes, persistent environment variables, and public GitHub webhook endpoints.
- Markdown editor: start with a simple textarea plus preview if that keeps MVP moving; replace with a richer editor only after the save and sync loop works.
- Database: use the smallest managed relational or document store that supports user settings, draft metadata, webhook state, and cached indexes.
