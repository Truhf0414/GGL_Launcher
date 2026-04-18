const path = require("path");
const fs = require("fs");
const { BrowserWindow } = require("electron");
const { getDebugLoggingEnabled } = require("./launcher-log");

let appRoot = path.join(__dirname, "..");
/** @type {string} */
let appIconPath = "";

/** @type {import("electron").BrowserWindow | null} */
let mainWindow = null;

/**
 * 必須在 `createMainIpcBridge` / `createMainWindow` 之前呼叫一次，讓 `getAppIconPath()` 與
 * `preload` / `index.html` 路徑以啟動入口目錄為準（`main.js` 傳 `__dirname`）。
 */
function configureMainWindow(deps = {}) {
  const root =
    typeof deps.appRoot === "string" && deps.appRoot.trim()
      ? path.resolve(deps.appRoot.trim())
      : path.join(__dirname, "..");
  appRoot = root;

  const ico = path.join(appRoot, "assets", "icon.ico");
  const png = path.join(appRoot, "assets", "icon.png");
  try {
    fs.accessSync(ico);
    appIconPath = ico;
  } catch {
    appIconPath = png;
  }
}

function getMainWindow() {
  return mainWindow;
}

function getAppIconPath() {
  return appIconPath;
}

function createMainWindow() {
  if (mainWindow) {
    if (mainWindow.isDestroyed()) mainWindow = null;
    else return;
  }

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 700,
    minWidth: 980,
    minHeight: 620,
    frame: false, // 無邊框
    transparent: true, // 透明背景
    backgroundColor: "#00000000",
    titleBarStyle: "hidden",
    resizable: true,
    icon: appIconPath,
    show: false,
    webPreferences: {
      preload: path.join(appRoot, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      // 需要讓 preload 使用 Node（path/fs 等）以提供安全的 bridge API
      sandbox: false,
    },
  });

  // Debug 用：把 renderer 的 console/error 印到主程序
  // 平常不掛，避免噪音與 deprecated 警告
  if (getDebugLoggingEnabled()) {
    try {
      // Electron 新版事件會以單一 params 物件傳入
      mainWindow.webContents.on("console-message", (_e, params) => {
        const lvl = Number(params?.level ?? 0);
        const message = String(params?.message ?? "");
        const line = Number(params?.lineNumber ?? 0);
        const sourceId = String(params?.sourceId ?? "");
        console.log(`[RENDERER:${lvl}] ${message} (${sourceId}:${line})`);
      });
      mainWindow.webContents.on("render-process-gone", (_e, details) => {
        console.log("[RENDERER:GONE]", details);
      });
      mainWindow.webContents.on("preload-error", (_e, preloadPath, error) => {
        console.log(
          "[PRELOAD:ERROR]",
          preloadPath,
          String(error?.message ?? error),
        );
      });
    } catch {}
  }

  mainWindow.loadFile(path.join(appRoot, "index.html"));
  mainWindow.once("ready-to-show", () => {
    try {
      const w = getMainWindow();
      if (w && !w.isDestroyed()) w.show();
    } catch {}
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  function sendWindowPowerState() {
    try {
      mainWindow?.webContents?.send("window:power", {
        minimized: Boolean(mainWindow?.isMinimized?.()),
      });
    } catch {}
  }

  // Renderer can pause background video more accurately with window state.
  mainWindow.on("minimize", sendWindowPowerState);
  mainWindow.on("restore", sendWindowPowerState);
  mainWindow.on("show", sendWindowPowerState);
  mainWindow.on("hide", sendWindowPowerState);
  mainWindow.on("focus", sendWindowPowerState);
  mainWindow.on("blur", sendWindowPowerState);
  // initial
  mainWindow.webContents.on("did-finish-load", sendWindowPowerState);
}

module.exports = {
  configureMainWindow,
  createMainWindow,
  getMainWindow,
  getAppIconPath,
};
