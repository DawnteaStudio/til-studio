# til-studio

[English](README.md) | [한국어](README_ko.md)

til-studio is a GitHub-backed writing workspace and public reading site for a personal TIL repository. It lets you write study notes in Studio, save them back to GitHub, and browse the same repository as a blog or learning map.

The first target repository is [`DawnteaStudio/TIL`](https://github.com/DawnteaStudio/TIL), but the app is designed around configuration so it can be adapted to another GitHub-backed TIL repository.

## Table of Contents

- [What You Can Do](#what-you-can-do)
- [Screen Guide](#screen-guide)
- [Recommended Workflow](#recommended-workflow)
- [Folder Visibility Rules](#folder-visibility-rules)
- [Repository Shape](#repository-shape)
- [Markdown Image Assets](#markdown-image-assets)
- [Local Development](#local-development)
- [GitHub App Setup](#github-app-setup)
- [Environment Variables](#environment-variables)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)

## What You Can Do

- Connect a GitHub TIL repository through a GitHub App.
- Browse the repository as a public home page, blog index, learning map, and document reader.
- Choose which top-level folders are visible from Studio.
- Hide README files from public recent lists and article lists.
- Write notes without hand-crafting the final Markdown structure.
- Generate note paths from area, topic, source, and title.
- Research a theory keyword and create a review-ready theory draft.
- Save changes directly with Quick Save or through a pull request with Review Save.

## Screen Guide

### Home: `/`

The home page summarizes the connected repository and shows recent public documents. It respects the folder visibility settings saved in Studio. README files are not shown in the recent list.

Use this page when you want a quick overview or a lightweight portfolio-style entry point.

### Blog: `/blog`

The blog page lists note and theory articles. It is meant for reading actual study records, so README guide files are excluded. Use the folder tree on the left to narrow the list by area, topic, or nested folder.

Use this page when you want to read the repository like a blog.

### Learning Map: `/map`

The learning map groups articles by top-level area:

- `cs`
- `languages`
- `projects`
- `coding-test`

It shows counts for notes and theory documents, topic cards, and a repository index. README guide files stay out of the article map.

Use this page when you want to understand the shape of the whole repository.

### Document Reader: `/docs/<path>`

The document page renders a Markdown file from the GitHub repository. The left side includes navigation back to Home, Blog, and Map, plus heading links extracted from the article.

Use this page when you want to read a single note or theory document.

### Studio: `/studio`

Studio is the writing workspace.

- Left panel: choose visible public folders, pick a writing location, and switch between Notes and Theory.
- Center panel: write a note draft, preview Markdown, or edit raw Markdown.
- Right panel: choose Quick or Review save, or research a theory concept.

Use this page when you want to create or update content in the TIL repository.

## Recommended Workflow

1. Open `/studio`.
2. In "Public folders", keep only the top-level folders you want to show publicly.
3. Pick an area and topic from the folder tree.
4. For a note, fill in title, source, learned content, questions, conclusion, and experiments.
5. Click "Markdown 만들기" to turn the note draft into Markdown.
6. Review the generated path and Markdown preview.
7. Choose Quick for a direct commit or Review for a pull request.
8. Save to GitHub.
9. Open `/blog`, `/map`, or `/docs/<path>` to read the published result.

For theory writing:

1. Switch Studio to Theory.
2. Select the destination topic.
3. Search a concept keyword in the right panel.
4. Create a draft from the research result.
5. Review the Markdown.
6. Save through Review mode.

## Folder Visibility Rules

Folder visibility is controlled from Studio and saved in local storage and a cookie.

- If a top-level folder is unchecked, its documents are hidden from public views that respect visibility.
- If every folder is visible, all non-README public documents can appear.
- README files are guide/index files and are hidden from recent article lists by default.
- README variants such as `README.md`, `README_ko.md`, `README.en.md`, and nested `.../README.md` are treated as README files.
- At least one top-level folder must remain visible.

This means a document is shown only when both conditions are true:

1. Its top-level folder is visible.
2. It is not a README guide file.

## Repository Shape

til-studio assumes a topic-based TIL structure:

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

### notes

`notes/` is for raw learning records:

- Lecture or book notes
- Work-in-progress understanding
- Confusing points and questions
- Experiments and current conclusions
- Source-aware writing

### theory

`theory/` is for refined concept documents:

- Conclusion-oriented summaries
- Reusable reference material
- Documents synthesized from one or more notes
- Review, interview, or lookup material

`coding-test/` is kept separate from the note/theory writing flow, but it can still be shown or hidden through top-level folder visibility.

## Markdown Image Assets

Article images should live beside the Markdown document that uses them. This keeps GitHub rendering, til-studio rendering, and local editing aligned.

Rules:

- Use lowercase kebab-case for Markdown filenames, such as `kmp.md` or `union-find.md`.
- Treat the filename without `.md` as the article slug.
- Put article-specific images in `<article-slug>_images/` next to the Markdown file.
- Name image files `<article-slug>-NN.<ext>`, using two-digit numbering in the order the images appear.
- Use relative Markdown links from the article, such as `./kmp_images/kmp-01.png`.
- Use exact case for every path segment.
- Use a short lowercase suffix only when it adds useful meaning, such as `kmp-05-failure.png`.
- Keep shared images in a named shared folder such as `../shared_images/` only when multiple nearby documents reuse the same asset.

Example:

```text
cs/algorithms/theory/
├── kmp.md
└── kmp_images/
    ├── kmp-01.png
    ├── kmp-02.png
    └── kmp-03.png
```

```md
![KMP comparison](./kmp_images/kmp-01.png)
```

## Local Development

Use Node.js `22.12.0` or newer. The repository includes `.nvmrc` and `.node-version`.

```bash
nvm install
nvm use
npm ci
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Fill in `.env.local`, then start the development server:

```bash
npm run dev
```

Open:

- Home: `http://localhost:3000`
- Blog: `http://localhost:3000/blog`
- Learning map: `http://localhost:3000/map`
- Studio: `http://localhost:3000/studio`

## GitHub App Setup

Create a GitHub App and install it on the TIL repository.

Recommended repository permissions:

- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read

Recommended webhook events:

- Push
- Pull request

For local development, the webhook URL can point to a tunneling URL that forwards to:

```text
http://localhost:3000/api/github/webhook
```

Use the same webhook secret in GitHub and `.env.local`.

## Environment Variables

```env
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
GITHUB_INSTALLATION_ID=
TIL_REPOSITORY_OWNER=DawnteaStudio
TIL_REPOSITORY_NAME=TIL
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini-2024-07-18
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Notes:

- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_INSTALLATION_ID` are required for pages that read the GitHub repository.
- `GITHUB_APP_PRIVATE_KEY` can store newlines as escaped `\n`; the app converts them before creating the GitHub client.
- `AI_PROVIDER` can be `openai` or `gemini`; it defaults to `openai`.
- `OPENAI_API_KEY` is required when `AI_PROVIDER=openai`.
- `GEMINI_API_KEY` is required when `AI_PROVIDER=gemini`.
- `TIL_REPOSITORY_OWNER` and `TIL_REPOSITORY_NAME` default to `DawnteaStudio` and `TIL` when omitted.

## Verification

Run unit and component tests:

```bash
npm run test
```

Run lint:

```bash
npm run lint
```

Run browser e2e tests:

```bash
npx playwright install chromium
npm run test:e2e
```

The current e2e suite explores:

- Studio workspace controls
- Learning Map repository structure
- Blog index document listing

Run a production build:

```bash
npm run build
```

## Troubleshooting

### "GitHub App environment variables are missing"

The app tried to read the repository before GitHub App credentials were available. Create `.env.local` and fill in:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_INSTALLATION_ID`

Restart the dev server after changing `.env.local`.

### npm install fails on one Mac but not another

Use the project Node version on both machines:

```bash
nvm install
nvm use
npm ci
```

Do not add platform-specific native packages, such as an x64-only binding, as direct dependencies unless the app truly imports them directly.

### Playwright says the browser executable is missing

Install the browser once:

```bash
npx playwright install chromium
```

### Next.js warns about `allowedDevOrigins`

When e2e tests use `127.0.0.1`, Next.js may warn about development resource origins. The warning does not necessarily fail the tests. If you want to remove it, add `127.0.0.1` to `allowedDevOrigins` in `next.config.ts`.

## Roadmap

- Improve lecture and book writing sessions.
- Support creating new folders from Studio.
- Show save results and pull request links more clearly.
- Add duplicate-aware theory lookup.
- Add richer public learning-map views.
- Make repository configuration friendlier for users beyond the original TIL repo.

## License

No open source license has been selected yet.

Until a license is added, the default copyright rules apply. If this project is opened for other people to use, modify, and distribute, a license should be added explicitly.
