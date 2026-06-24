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
