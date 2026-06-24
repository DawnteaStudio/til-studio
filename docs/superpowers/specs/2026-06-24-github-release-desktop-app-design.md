# GitHub Release Desktop App Design

Date: 2026-06-24

## Purpose

til-studio should be installable as a normal macOS app from GitHub Releases instead of depending on a local repository checkout, `npm install`, and a generated `TIL Studio.app` launcher.

The first release milestone is a Release MVP: build and publish a downloadable macOS app artifact through GitHub Releases. Signing, notarization, and automatic updates are important follow-up work, but they are not required for the first release artifact.

## User Experience

The user downloads `TIL Studio.dmg` from the latest GitHub Release, opens it, drags `TIL Studio.app` into Applications, and launches it from Applications or Spotlight.

The installed app starts til-studio without requiring the user to run `git pull`, `npm install`, `npm run build`, or `npm run desktop:app` on their machine.

The current development menu-bar launcher can remain for local development, but the release artifact is the preferred app-like path.

## Release MVP Scope

- Add an Electron packaging path that produces macOS `dmg` and `zip` artifacts.
- Build the Next.js production output before packaging.
- Package the Electron entry point, server controller, production Next output, and runtime files needed by `next start`.
- Add npm scripts for local distribution builds.
- Add a GitHub Actions workflow that builds release artifacts when a version tag is pushed.
- Upload the artifacts to a GitHub Release.
- Document how to create a release and install the app.

## Explicit Non-Goals

- No Apple Developer ID signing in the MVP.
- No notarization in the MVP.
- No automatic updates in the MVP.
- No Windows or Linux packaging in the MVP.
- No migration to Tauri or a fully native app in the MVP.
- No change to the GitHub-backed content model.

## Architecture

The packaged app continues to use Electron as the host shell. Electron owns the macOS app lifecycle and starts a bundled production Next.js server on a local port. It then opens the Studio URL in the user's browser.

The packaged runtime must not depend on the repository checkout path. The Electron process should detect whether it is running packaged or unpackaged:

- In development, it can keep using the project root and existing local scripts.
- In a packaged app, it should use `process.resourcesPath` or the app resource directory as the application root.

The server process should prefer a bundled Next.js production build. If the packaged build is missing, the app should show a clear error instead of trying to run `npm install` or rebuilding on the user's machine.

## Build and Release Flow

Local release smoke flow:

```bash
npm run build
npm run dist:mac
```

GitHub release flow:

1. Update `package.json` version.
2. Push a matching version tag such as `v0.2.0`.
3. GitHub Actions installs dependencies, builds Next.js, packages the macOS app, and attaches artifacts to the GitHub Release.
4. The user downloads the `.dmg` artifact from the release page.

## Error Handling

The app should surface startup failures through a native Electron dialog. Startup errors must include enough context to distinguish:

- missing packaged Next build;
- port already in use;
- server process failure;
- missing environment variables for GitHub App integration.

The app should not silently disappear when startup fails.

## Security and Trust

The MVP may be unsigned, which means macOS Gatekeeper can warn the user when opening the app. This is acceptable only for the first release milestone and must be documented clearly.

The follow-up production-quality milestone should add Developer ID signing and Apple notarization. Automatic updates should wait until the app is signed, because macOS auto-update support requires a signed app.

## Testing

Verification for the MVP:

- `npm run build` succeeds.
- `npm run dist:mac` creates `dmg` and `zip` artifacts.
- The packaged app launches outside the repository checkout.
- The app opens `/studio` successfully.
- Startup failure paths show visible dialogs instead of exiting silently.
- GitHub Actions release workflow can produce artifacts from a tag.

## Open Follow-Ups

- Add app icon assets.
- Add Developer ID signing and notarization.
- Add `electron-updater` with GitHub Releases after signing is configured.
- Consider in-app release notes and update status UI.
