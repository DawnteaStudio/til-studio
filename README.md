# til-studio

til-studio is a personal TIL workspace and public site for `DawnteaStudio/TIL`.

## MVP

- Write topic-based `notes` into the TIL repository.
- Use AI to organize notes and find missing sections.
- Look up existing `theory` by keywords before creating new theory files.
- Save ordinary notes with Quick Save.
- Save theory and structural changes with Review Save.
- Render the TIL repository as a public blog and repository-structure learning map.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

- public site: `http://localhost:3000`
- studio: `http://localhost:3000/studio`

## Verification

```bash
npm run test
npm run build
npm run test:e2e
```
