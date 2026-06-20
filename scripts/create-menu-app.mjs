import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const appName = "TIL Studio";
const appRoot = join(projectRoot, `${appName}.app`);
const contentsRoot = join(appRoot, "Contents");
const macOSRoot = join(contentsRoot, "MacOS");
const plistPath = join(contentsRoot, "Info.plist");
const executablePath = join(macOSRoot, appName);

const nodePath = process.execPath.replace(/\/node$/, "");

mkdirSync(macOSRoot, { recursive: true });

writeFileSync(
  plistPath,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>${appName}</string>
  <key>CFBundleExecutable</key>
  <string>${appName}</string>
  <key>CFBundleIdentifier</key>
  <string>studio.til.menubar</string>
  <key>CFBundleName</key>
  <string>${appName}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>LSBackgroundOnly</key>
  <true/>
</dict>
</plist>
`,
  "utf8",
);

writeFileSync(
  executablePath,
  `#!/bin/zsh
export PATH="${nodePath}:$PATH"
export TIL_STUDIO_PROJECT_DIR="${projectRoot}"
cd "${projectRoot}"
exec npm run desktop
`,
  { encoding: "utf8", mode: 0o755 },
);

console.log(`Created ${appRoot}`);
