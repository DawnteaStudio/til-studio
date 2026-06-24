# GitHub Release Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a macOS installable `TIL Studio.dmg` release artifact through electron-builder and GitHub Releases.

**Architecture:** Next.js will build with `output: 'standalone'`, then a small script will copy `.next/static` and `public` into `.next/standalone`. In development, Electron keeps using `npm run start`; in packaged mode, Electron starts the bundled standalone `server.js` with `ELECTRON_RUN_AS_NODE=1` so the user does not need a repository checkout, Node, npm, or local dependencies.

**Tech Stack:** Next.js 16 standalone output, Electron 42, electron-builder, Vitest, GitHub Actions.

---

## File Map

- Modify `next.config.ts`: enable Next standalone output.
- Modify `desktop/server-process.mjs`: support packaged standalone server execution, disable rebuilds in packaged mode, and expose capability state.
- Modify `desktop/main.mjs`: choose development vs packaged server configuration and hide rebuild controls in packaged mode.
- Create `scripts/prepare-standalone.mjs`: copy `public` and `.next/static` into `.next/standalone`.
- Modify `package.json`: add `electron-builder`, distribution scripts, and build metadata.
- Modify `package-lock.json`: capture new dependency and metadata.
- Create `.github/workflows/release-desktop.yml`: build macOS release artifacts on version tags and upload them to GitHub Releases.
- Modify `README.md` and `README_ko.md`: document Release MVP installation and publishing.
- Modify `tests/desktop/server-process.test.ts`: cover packaged standalone execution and packaged rebuild rejection.

### Task 1: Standalone Server Configuration

**Files:**
- Modify: `next.config.ts`
- Create: `scripts/prepare-standalone.mjs`
- Modify: `package.json`

- [ ] **Step 1: Enable standalone output**

Edit `next.config.ts` to:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Add standalone asset copy script**

Create `scripts/prepare-standalone.mjs`:

```js
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const standaloneRoot = join(projectRoot, ".next", "standalone");
const standaloneNextRoot = join(standaloneRoot, ".next");
const publicSource = join(projectRoot, "public");
const publicTarget = join(standaloneRoot, "public");
const staticSource = join(projectRoot, ".next", "static");
const staticTarget = join(standaloneNextRoot, "static");

if (!existsSync(join(standaloneRoot, "server.js"))) {
  throw new Error("Missing .next/standalone/server.js. Run `npm run build` before preparing the standalone app.");
}

mkdirSync(standaloneNextRoot, { recursive: true });

if (existsSync(publicSource)) {
  rmSync(publicTarget, { recursive: true, force: true });
  cpSync(publicSource, publicTarget, { recursive: true });
}

if (existsSync(staticSource)) {
  rmSync(staticTarget, { recursive: true, force: true });
  cpSync(staticSource, staticTarget, { recursive: true });
}

console.log("Prepared .next/standalone for desktop packaging.");
```

- [ ] **Step 3: Add scripts**

Add scripts to `package.json`:

```json
"build:desktop": "next build && node scripts/prepare-standalone.mjs",
"dist:mac": "npm run build:desktop && electron-builder --mac",
"dist:mac:dir": "npm run build:desktop && electron-builder --mac dir"
```

- [ ] **Step 4: Verify standalone build**

Run:

```bash
npm run build:desktop
```

Expected: `.next/standalone/server.js`, `.next/standalone/.next/static`, and `.next/standalone/public` exist.

### Task 2: Packaged Electron Server Startup

**Files:**
- Modify: `desktop/server-process.mjs`
- Modify: `desktop/main.mjs`
- Modify: `tests/desktop/server-process.test.ts`

- [ ] **Step 1: Add failing tests for packaged mode**

Add tests that assert a packaged controller starts `server.js` with the Electron binary as Node:

```ts
test("starts the packaged standalone server without npm", async () => {
  const serverProcess = createFakeChild();
  const spawn = vi.fn(() => serverProcess);
  const openExternal = vi.fn();
  const controller = createServerProcessController({
    cwd: "/Applications/TIL Studio.app/Contents/Resources/next",
    port: 3100,
    spawn,
    openExternal,
    buildExists: () => true,
    allowBuild: false,
    serverCommand: "/Applications/TIL Studio.app/Contents/MacOS/TIL Studio",
    serverArgs: ["server.js"],
    serverEnv: { ELECTRON_RUN_AS_NODE: "1" },
  });

  await controller.start();

  expect(spawn).toHaveBeenCalledWith(
    "/Applications/TIL Studio.app/Contents/MacOS/TIL Studio",
    ["server.js"],
    expect.objectContaining({
      cwd: "/Applications/TIL Studio.app/Contents/Resources/next",
      env: expect.objectContaining({ ELECTRON_RUN_AS_NODE: "1", PORT: "3100" }),
    }),
  );
  expect(openExternal).toHaveBeenCalledWith("http://localhost:3100/studio");
});
```

Add a test that packaged rebuilds are rejected:

```ts
test("rejects rebuilds when build is disabled", async () => {
  const controller = createServerProcessController({
    cwd: "/Applications/TIL Studio.app/Contents/Resources/next",
    port: 3100,
    spawn: vi.fn(),
    openExternal: vi.fn(),
    buildExists: () => true,
    allowBuild: false,
  });

  await expect(controller.rebuildAndRestart()).rejects.toThrow("Rebuild is not available in the packaged app.");
});
```

- [ ] **Step 2: Implement server options**

Update `createServerProcessController` to accept:

```js
const allowBuild = options.allowBuild ?? true;
const serverCommand = options.serverCommand || "npm";
const serverArgs = options.serverArgs || ["run", "start", "--", "-p", String(port)];
const serverEnv = options.serverEnv || {};
```

Use `serverCommand`, `serverArgs`, and `serverEnv` when spawning the server. If `buildExists()` is false and `allowBuild` is false, throw:

```js
throw new Error("Packaged TIL Studio is missing its bundled Next.js server. Reinstall the app from the latest GitHub Release.");
```

If `rebuildAndRestart()` runs while `allowBuild` is false, throw:

```js
throw new Error("Rebuild is not available in the packaged app.");
```

Include `canRebuild: allowBuild` in `status()`.

- [ ] **Step 3: Wire packaged mode in Electron main**

In `desktop/main.mjs`, derive:

```js
function appRoot() {
  if (process.env.TIL_STUDIO_PROJECT_DIR) return process.env.TIL_STUDIO_PROJECT_DIR;
  if (app.isPackaged) return path.join(process.resourcesPath, "next");
  return path.resolve(import.meta.dirname, "..");
}

function serverOptions() {
  if (!app.isPackaged) return {};
  return {
    allowBuild: false,
    buildExists: () => existsSync(path.join(appRoot(), "server.js")),
    serverCommand: process.execPath,
    serverArgs: ["server.js"],
    serverEnv: { ELECTRON_RUN_AS_NODE: "1" },
  };
}
```

Hide `Rebuild & Restart` when `controller.status().canRebuild` is false.

- [ ] **Step 4: Run desktop tests**

Run:

```bash
npm run test -- tests/desktop/server-process.test.ts
```

Expected: all desktop server-process tests pass.

### Task 3: Electron Builder Packaging

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install packaging dependency**

Run:

```bash
npm install --save-dev electron-builder
```

- [ ] **Step 2: Add electron-builder metadata**

Add a top-level `build` section to `package.json`:

```json
"main": "desktop/main.mjs",
"build": {
  "appId": "studio.til.desktop",
  "productName": "TIL Studio",
  "artifactName": "${productName}-${version}-${arch}.${ext}",
  "asar": true,
  "files": [
    "desktop/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": ".next/standalone",
      "to": "next"
    }
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      "dmg",
      "zip"
    ]
  },
  "dmg": {
    "artifactName": "${productName}-${version}-${arch}.${ext}"
  },
  "publish": [
    {
      "provider": "github",
      "owner": "DawnteaStudio",
      "repo": "til-studio"
    }
  ]
}
```

- [ ] **Step 3: Ignore release artifacts**

Add `/dist/` to `.gitignore`.

- [ ] **Step 4: Run package smoke build**

Run:

```bash
npm run dist:mac:dir
```

Expected: `dist/mac*/TIL Studio.app` exists and contains `Contents/Resources/next/server.js`.

### Task 4: GitHub Release Workflow

**Files:**
- Create: `.github/workflows/release-desktop.yml`

- [ ] **Step 1: Add workflow**

Create `.github/workflows/release-desktop.yml`:

```yaml
name: Release desktop app

on:
  push:
    tags:
      - "v*.*.*"

permissions:
  contents: write

jobs:
  macos:
    runs-on: macos-15
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22.12.0"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test -- tests/desktop/server-process.test.ts

      - name: Build and publish macOS app
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run dist:mac -- --publish always
```

- [ ] **Step 2: Validate workflow syntax by inspection**

Run:

```bash
sed -n '1,220p' .github/workflows/release-desktop.yml
```

Expected: tag trigger, `contents: write`, Node 22.12.0, `npm ci`, desktop tests, and `npm run dist:mac -- --publish always` are present.

### Task 5: Documentation

**Files:**
- Modify: `README.md`
- Modify: `README_ko.md`

- [ ] **Step 1: Document install path**

Add a "GitHub Release desktop app" section near local development:

```md
### GitHub Release desktop app

For app-like installation on macOS, download the latest `TIL Studio.dmg` from GitHub Releases, open it, and drag `TIL Studio.app` into Applications.

The Release MVP is unsigned. macOS may show a Gatekeeper warning until Developer ID signing and notarization are added.
```

- [ ] **Step 2: Document publishing path**

Add release commands:

```md
To publish a desktop release:

1. Update `package.json` version.
2. Commit the version change.
3. Push a matching tag, for example `v0.2.0`.
4. GitHub Actions builds and attaches the macOS artifacts to the GitHub Release.
```

- [ ] **Step 3: Keep local launcher docs**

Keep the existing macOS menu-bar launcher docs, but label them as local development convenience rather than the preferred install path.

### Task 6: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test -- tests/desktop/server-process.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build:desktop
```

Expected: PASS and `.next/standalone/server.js` exists.

- [ ] **Step 3: Run package smoke build**

Run:

```bash
npm run dist:mac:dir
```

Expected: PASS and a packaged `TIL Studio.app` directory exists under `dist/`.

- [ ] **Step 4: Check git diff**

Run:

```bash
git diff --stat
git status --short
```

Expected: only planned files are changed, plus pre-existing unrelated user changes remain unstaged.
