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
- [참고 자료](#참고-자료)

## 개념

## 핵심 내용

## 주의할 점

## 관련 notes

## 참고 자료
```

`참고 자료` is required when the theory document is generated from web research. The UI must show clickable sources before draft creation, and the generated Markdown must preserve those sources so the reader can inspect where the definition came from.

## Studio Flow

The main writing flow is workspace-first:

1. Choose the draft kind in the left workspace panel: `Notes` or `Theory`.
2. Select a repository area such as `cs`, `languages`, or `projects`.
3. Select or create a topic folder such as `algorithms`, `spring`, or `javascript`.
4. For `Notes`, select or create a source folder under `notes`, using only a simple folder name.
5. In `Notes`, write the study note and optionally use AI to organize it into the default note template.
6. In `Theory`, enter a concept keyword and run web research.
7. Review the web research result, including definition, key points, cautions, and sources.
8. Create a theory draft only after the user confirms the reviewed research.
9. Save to GitHub using the draft kind's default save mode.

The Studio workspace selector must not expose raw repository implementation folders such as `notes` and `theory` as places the user manually chooses. The selected draft kind determines the destination folder:

- `Notes` writes to `<area>/<topic>/notes/<source>/<slug>.md`.
- `Theory` writes to `<area>/<topic>/theory/<concept-slug>.md`.

The note file unit is chapter/topic based, not daily. Examples:

```text
cs/algorithms/notes/inflearn-algorithm/01-time-complexity.md
cs/algorithms/notes/inflearn-algorithm/02-sorting.md
cs/spring/notes/inflearn-spring-db/transactional-rollback.md
```

## Studio UI

The writing screen uses a workspace layout:

- left panel: draft kind, area, topic, source, and visibility preferences
- center panel: Markdown editor and preview
- right panel: mode-specific tools and save controls

The app is not a generic note app. It is a repository-aware writing studio.

The left panel is a guided workspace picker, not a generic file browser:

- `Notes` and `Theory` are mode controls.
- `Area` shows publishable top-level roots.
- `Topic` shows existing topics and supports creating a new topic by slugging the entered name.
- `Source` is shown only for `Notes`, lists existing source folders under the selected topic's `notes` folder, and supports entering a new lecture, book, course, or project source.
- Public visibility preferences remain separate from the write-location selector.

Source selection belongs in the center writing workspace near the save-path preview, not in the left navigation. The left navigation chooses only draft kind, area, and topic. The center source picker must clearly separate existing source folders from creating a new source, show the selected source, and preview the slugged folder name that will be written under `notes/<source>/`.

The right panel changes by draft kind:

- `Notes`: show `Save` with Quick or Review mode. Reflective note drafting happens from the center panel's `글 초안 만들기` action.
- `Theory`: show `Concept Research`, the reviewed research result, and `Save` in Review mode.
- The missing-section checker is not part of the current Studio surface.
- `Theory Lookup` and standalone `Theory Title` inputs should not appear as separate concepts. Theory title is derived from reviewed concept research and may be edited later only if a dedicated title-editing flow is added.

Required MVP actions:

- select existing area, topic, and source
- create new topic
- create new source
- create topic note file
- generate note template
- generate table of contents and parent navigation
- run AI note drafting through `글 초안 만들기`
- edit the final Markdown before saving
- Quick Save
- Review Save
- run concept web research for theory
- create a theory draft from reviewed research

## AI Scope

AI is included in MVP, but with constrained authority.

MVP AI actions:

- `글 초안 만들기`: validate note workspace, title, and learned content, then turn rough notes into a readable Korean study article that follows the notes template.
- `웹에서 조사하기`: research a concept keyword for a theory document and return a user-reviewable summary with sources.
- `Theory 초안 만들기`: after the user reviews the research result, create a Markdown theory draft that follows the theory template.

Note drafting should feel closer to a readable Inpa Tistory-style learning post than a mechanical formatter. It should preserve the user's confusion and thinking trail, make the "처음엔 이렇게 헷갈렸다" learning arc visible, and add general background explanation where it helps the reader. It should not create an "확인할 점" section; unresolved confusion should be clarified inside the article when possible, without inventing personal experiences or unsupported specifics.

Notes should read like the user's own study reflection, not a formal `습니다/합니다` explanation. The AI should split long ideas into readable short paragraphs. `헷갈린 점` should contain only the confusion or mistaken mental model the user had, while the resolved interpretation belongs in `현재 이해한 결론` even when the user did not manually repeat it there. Examples should be expanded around the user's own examples first, with a concrete flow such as question, situation, why it breaks down, before/after comparison, and lesson. A `참고자료` section belongs at the end only when the AI actually used or received references; otherwise it should be omitted.

The note cleanup API must not send only the raw Markdown as the user message. It should wrap the source note in a strict drafting prompt that tells the model to remove empty template residue, resolve every item in `헷갈린 점`, expand examples with concrete situations or code, and self-check the result before returning Markdown.

The center preview defaults to a rendered article preview. Raw Markdown appears only when `Markdown 직접 수정` is checked, and saving should use the same Markdown content that is currently being previewed or edited.

Studio notices should not block the workspace. Completion and failure notices need both a visible close control and a short auto-dismiss timeout. Progress notices can stay visible while the action is running.

AI does not silently publish content. The user must approve final title, path, content, and save mode.

AI provider selection is environment-driven:

- `AI_PROVIDER=openai` uses the OpenAI Responses API provider.
- `AI_PROVIDER=gemini` uses the Gemini `generateContent` provider.
- Both providers must implement the same Studio contract: note cleanup returns Markdown, and theory research returns `title`, `concept`, `keyPoints`, `cautions`, and `sources`.
- Studio UI should call only the shared AI service functions, not provider-specific clients.

Studio must also support changing local runtime settings from a gear-shaped settings panel, without creating a separate settings page. The settings panel can update non-secret values such as AI provider, model names, and repository owner/name, and can accept API keys as password-style secret inputs.

Secret handling rules:

- The browser may submit a new API key to the server when the user saves settings, but the server must never return stored secret values to the browser.
- Settings reads expose only whether each secret is configured, for example `openAIKeyConfigured: true`.
- Stored runtime settings are kept in a gitignored local file and are read server-side before falling back to `.env.local` / `process.env`.
- AI and GitHub clients must read settings through a shared server-side settings helper, so changing settings does not require editing `.env.local` for normal local usage.

Saving a note or theory must also update the selected topic's `README.md`. The save API should enrich the requested file changes with a til-studio-managed README index block that lists notes grouped by source and theory documents. Existing prose outside the managed block must be preserved. Quick saves update the README in the same commit; review saves include the README in the same draft PR.

## Theory Research And Creation

Theory creation in MVP is research-first.

Flow:

1. User selects `Theory` in the left workspace panel.
2. User selects the target area and topic.
3. User enters a concept keyword.
4. Studio runs web research and displays the proposed title, concept definition, key points, cautions, and clickable sources.
5. User reviews the result.
6. Only after review, user clicks `Theory 초안 만들기`.
7. Studio creates Markdown using the theory template and the reviewed research result.
8. User edits the final Markdown if needed.
9. User saves with Review mode.

Existing theory duplicate detection is deferred. When added later, it should appear as part of the research result review, not as a separate `Theory Lookup` panel.

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

### Visibility Preferences

Studio owns the public visibility preference for top-level repository folders. When the user turns off a root folder in Studio, the app stores that root folder selection under `til-studio.visible-root-folders` in both local storage and a same-name cookie so client and server rendered public surfaces can respect it.

Affected public surfaces:

- home recent documents
- blog document list and folder navigation
- learning map areas and repository index

The preference is a display filter only. It does not delete files, hide files from GitHub, or change save behavior.

### Markdown Image Assets

Markdown image paths are resolved relative to the Markdown file that references them, matching GitHub's rendering behavior.

Document filenames use lowercase kebab-case. The document slug is the filename without `.md`.

For a document at:

```text
cs/algorithms/theory/kmp.md
```

An image reference such as:

```md
![KMP table](./kmp_images/kmp-01.png)
```

resolves to:

```text
cs/algorithms/theory/kmp_images/kmp-01.png
```

Recommended convention:

- keep article-specific images in a sibling folder next to the Markdown file
- name the folder `<article-slug>_images`
- name image files `<article-slug>-NN.<ext>`, using two-digit numbering in document appearance order
- use relative Markdown links such as `./kmp_images/kmp-01.png`
- allow a short lowercase suffix only when it materially clarifies the image, such as `kmp-05-failure.png`
- shared images may use `../shared/<file>` when the folder is intentionally shared by nearby documents
- external `https://...` image URLs remain unchanged
- preserve exact case because GitHub and deployment file paths are case-sensitive

The public renderer converts relative image paths to GitHub raw URLs using the repository owner, repo, default branch, Markdown file path, and image path. Agents must preserve this convention when moving documents or adding images so rendered articles do not produce 404s.

## Learning Map

The learning map follows the GitHub repository structure exactly.

Example:

```text
TIL
└── cs
    └── algorithms
        ├── theory
        │   └── kmp.md
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
