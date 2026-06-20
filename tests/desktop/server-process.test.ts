import { EventEmitter } from "node:events";
import { describe, expect, test, vi } from "vitest";
import { createServerProcessController } from "../../desktop/server-process.mjs";

type FakeChildProcess = EventEmitter & {
  killed: boolean;
  kill: ReturnType<typeof vi.fn>;
  stdout: EventEmitter;
  stderr: EventEmitter;
};

function createFakeChild(): FakeChildProcess {
  const child = new EventEmitter() as FakeChildProcess;
  child.killed = false;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn(() => {
    child.killed = true;
    child.emit("exit", 0);
    return true;
  });
  return child;
}

describe("til-studio server process controller", () => {
  test("starts the production server without rebuilding when a build already exists", async () => {
    const serverProcess = createFakeChild();
    const spawn = vi.fn(() => serverProcess);
    const openExternal = vi.fn();
    const controller = createServerProcessController({
      cwd: "/repo/til-studio",
      port: 3100,
      spawn,
      openExternal,
      buildExists: () => true,
    });

    await controller.start();

    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledWith(
      "npm",
      ["run", "start", "--", "-p", "3100"],
      expect.objectContaining({ cwd: "/repo/til-studio" }),
    );
    expect(openExternal).toHaveBeenCalledWith("http://localhost:3100/studio");
    expect(controller.status()).toEqual({ running: true, starting: false, url: "http://localhost:3100/studio" });
  });

  test("builds before starting when no production build exists", async () => {
    const buildProcess = createFakeChild();
    const serverProcess = createFakeChild();
    const children = [buildProcess, serverProcess];
    const spawn = vi.fn(() => children.shift()!);
    const openExternal = vi.fn();
    const controller = createServerProcessController({
      cwd: "/repo/til-studio",
      port: 3100,
      spawn,
      openExternal,
      buildExists: () => false,
    });

    const startPromise = controller.start();
    expect(spawn).toHaveBeenCalledWith("npm", ["run", "build"], expect.objectContaining({ cwd: "/repo/til-studio" }));

    buildProcess.emit("exit", 0);
    await startPromise;

    expect(spawn).toHaveBeenLastCalledWith(
      "npm",
      ["run", "start", "--", "-p", "3100"],
      expect.objectContaining({ cwd: "/repo/til-studio" }),
    );
    expect(openExternal).toHaveBeenCalledWith("http://localhost:3100/studio");
    expect(controller.status()).toEqual({ running: true, starting: false, url: "http://localhost:3100/studio" });
  });

  test("does not spawn a duplicate server when already running", async () => {
    const serverProcess = createFakeChild();
    const spawn = vi.fn(() => serverProcess);
    const controller = createServerProcessController({
      cwd: "/repo/til-studio",
      port: 3100,
      spawn,
      openExternal: vi.fn(),
      buildExists: () => true,
    });

    await controller.start();

    await controller.start();

    expect(spawn).toHaveBeenCalledOnce();
  });

  test("stops the running server process", async () => {
    const serverProcess = createFakeChild();
    const spawn = vi.fn(() => serverProcess);
    const controller = createServerProcessController({
      cwd: "/repo/til-studio",
      port: 3100,
      spawn,
      openExternal: vi.fn(),
      buildExists: () => true,
    });

    await controller.start();

    controller.stop();

    expect(serverProcess.kill).toHaveBeenCalled();
    expect(controller.status()).toEqual({ running: false, starting: false, url: "http://localhost:3100/studio" });
  });

  test("rebuilds explicitly before restarting the server", async () => {
    const firstServerProcess = createFakeChild();
    const buildProcess = createFakeChild();
    const secondServerProcess = createFakeChild();
    const children = [firstServerProcess, buildProcess, secondServerProcess];
    const spawn = vi.fn(() => children.shift()!);
    const controller = createServerProcessController({
      cwd: "/repo/til-studio",
      port: 3100,
      spawn,
      openExternal: vi.fn(),
      buildExists: () => true,
    });

    await controller.start();
    const rebuildPromise = controller.rebuildAndRestart();

    expect(firstServerProcess.kill).toHaveBeenCalled();
    expect(spawn).toHaveBeenLastCalledWith("npm", ["run", "build"], expect.objectContaining({ cwd: "/repo/til-studio" }));

    buildProcess.emit("exit", 0);
    await rebuildPromise;

    expect(spawn).toHaveBeenLastCalledWith(
      "npm",
      ["run", "start", "--", "-p", "3100"],
      expect.objectContaining({ cwd: "/repo/til-studio" }),
    );
  });
});
