import path from "node:path";
import { app, dialog, Menu, nativeImage, shell, Tray } from "electron";
import { createServerProcessController } from "./server-process.mjs";

let tray = null;
let controller = null;
let busyLabel = null;

function projectRoot() {
  return process.env.TIL_STUDIO_PROJECT_DIR || path.resolve(import.meta.dirname, "..");
}

function trayImage() {
  const image = nativeImage.createEmpty();
  image.setTemplateImage(true);
  return image;
}

async function runAction(label, action) {
  busyLabel = label;
  updateMenu();
  try {
    await action();
  } catch (error) {
    dialog.showErrorBox("TIL Studio", error instanceof Error ? error.message : String(error));
  } finally {
    busyLabel = null;
    updateMenu();
  }
}

function updateMenu() {
  const current = controller.status();
  const stateText = busyLabel || (current.running ? "Running" : "Stopped");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `TIL Studio: ${stateText}`, enabled: false },
      { type: "separator" },
      {
        label: "Open Studio",
        enabled: current.running,
        click: () => shell.openExternal(current.url),
      },
      {
        label: current.running ? "Server Running" : "Start Server",
        enabled: !current.running && !busyLabel,
        click: () => runAction("Starting", () => controller.start()),
      },
      {
        label: "Stop Server",
        enabled: current.running && !busyLabel,
        click: () => {
          controller.stop();
          updateMenu();
        },
      },
      {
        label: "Restart Server",
        enabled: current.running && !busyLabel,
        click: () => runAction("Restarting", () => controller.restart()),
      },
      {
        label: "Rebuild & Restart",
        enabled: !busyLabel,
        click: () => runAction("Rebuilding", () => controller.rebuildAndRestart()),
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ]),
  );
}

app.whenReady().then(() => {
  app.dock?.hide();
  controller = createServerProcessController({
    cwd: projectRoot(),
    port: Number(process.env.TIL_STUDIO_PORT || 3100),
    openExternal: (url) => shell.openExternal(url),
  });
  tray = new Tray(trayImage());
  tray.setTitle("TIL");
  tray.setToolTip("TIL Studio");
  updateMenu();
  runAction("Starting", () => controller.start());
});

app.on("before-quit", () => {
  controller?.stop();
});
