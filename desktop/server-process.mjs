import { spawn as defaultSpawn } from "node:child_process";

export function createServerProcessController(options = {}) {
  const cwd = options.cwd || process.cwd();
  const port = options.port || Number(process.env.TIL_STUDIO_PORT || 3100);
  const spawn = options.spawn || defaultSpawn;
  const openExternal = options.openExternal || (() => {});
  const logger = options.logger || console;
  const url = `http://localhost:${port}/studio`;
  let serverProcess = null;
  let starting = false;

  function pipeLogs(child, label) {
    child.stdout?.on("data", (chunk) => logger.log(`[${label}] ${chunk}`.trimEnd()));
    child.stderr?.on("data", (chunk) => logger.error(`[${label}] ${chunk}`.trimEnd()));
  }

  function runCommand(command, args, label) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, PORT: String(port) },
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });

      pipeLogs(child, label);
      child.once("error", reject);
      child.once("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${label} exited with code ${code}`));
      });
    });
  }

  async function start() {
    if (serverProcess || starting) return status();

    starting = true;
    try {
      await runCommand("npm", ["run", "build"], "build");
      serverProcess = spawn("npm", ["run", "start", "--", "-p", String(port)], {
        cwd,
        env: { ...process.env, PORT: String(port) },
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });
      pipeLogs(serverProcess, "server");
      serverProcess.once("exit", () => {
        serverProcess = null;
      });
      serverProcess.once("error", (error) => {
        logger.error(error);
        serverProcess = null;
      });
      openExternal(url);
      return status();
    } finally {
      starting = false;
    }
  }

  function stop() {
    if (!serverProcess) return status();
    const child = serverProcess;
    serverProcess = null;
    child.kill();
    return status();
  }

  async function restart() {
    stop();
    return start();
  }

  function status() {
    return {
      running: Boolean(serverProcess),
      starting,
      url,
    };
  }

  return {
    start,
    stop,
    restart,
    status,
  };
}
