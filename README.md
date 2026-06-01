# til-studio

[English](README.md) | [한국어](README_ko.md)

til-studio is a GitHub-backed writing workspace for a personal TIL repository.

It is being built around this workflow:

1. Pick a location in a TIL repository.
2. Write rough study notes while learning from a lecture, book, or project.
3. Let AI clean up the note structure without removing the author's intent.
4. Search existing theory documents before creating a new one.
5. Save changes back to GitHub directly or through a review pull request.
6. Render the same repository as a public learning site.

The first target repository is [`DawnteaStudio/TIL`](https://github.com/DawnteaStudio/TIL), but the long-term direction is to make the app usable with other GitHub-backed TIL repositories too.

## Core Ideas

### notes

`notes/` is for raw learning records.

- Lecture or book based notes
- Things that are still being clarified
- Confusing points, experiments, and current understanding
- Source-aware writing

### theory

`theory/` is for refined concept documents.

- Conclusion-oriented summaries
- Reusable reference material
- Synthesized from one or more notes
- Useful for review, interviews, and later lookup

### Repository Shape

til-studio assumes a simple topic-based structure:

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

`coding-test/` is intentionally kept separate from the study-note workflow.

## Current MVP

- GitHub App based access to a TIL repository
- Repository tree loading
- Studio screen for selecting a TIL location
- Note path generation from selected topic, source folder, and title
- Theory path generation from selected topic and title
- Note and theory markdown templates
- AI note cleanup and missing-section prompts
- Quick Save for direct commits
- Review Save for pull-request based changes
- Webhook endpoint for future bidirectional sync
- Public map and document routes

## Local Development

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
GITHUB_INSTALLATION_ID=
TIL_REPOSITORY_OWNER=DawnteaStudio
TIL_REPOSITORY_NAME=TIL
OPENAI_API_KEY=
```

Run the development server:

```bash
npm run dev
```

Open:

- Public site: `http://localhost:3000`
- Studio: `http://localhost:3000/studio`
- Learning map: `http://localhost:3000/map`

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

The webhook secret can be any strong random value, as long as the same value is stored in `.env.local`.

## Verification

Run unit tests:

```bash
npm run test
```

Run a production build:

```bash
npm run build
```

Run browser tests:

```bash
npm run test:e2e
```

## Roadmap

- Improve the writing session flow for lectures and books
- Support creating new folders from the Studio UI
- Show save results and pull request links more clearly
- Add duplicate-aware theory lookup
- Add richer public learning-map views
- Make repository configuration friendlier for users beyond the original TIL repo

## License

No open source license has been selected yet.

Until a license is added, the default copyright rules apply. If this project is opened for other people to use, modify, and distribute, a license should be added explicitly. MIT is likely a good default for a lightweight app where reuse and extension are encouraged, but the final choice should match the intended contribution and distribution model.
