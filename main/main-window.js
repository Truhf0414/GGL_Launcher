const path = require("path");
const fs = require("fs");
const { BrowserWindow } = require("electron");
const { getDebugLoggingEnabled } = require("./launcher-log");
const { gglEvent, gglError } = require("./ggl-log");
const { attachRendererFailureLog } = require("./renderer-failure-log");

let appRoot = path.join(__dirname, "..");
/** @type {string} */
let appIconPath = "";

/** @type {import("electron").BrowserWindow | null} */
let mainWindow = null;

/** @type {(minimized: boolean) => void} 由 ipc-bridge 送出並記住（renderer:ready 時重送） */
let sendWindowPower = () => {};

/**
 * 必須在 `createMainWindow` 之前呼叫一次，讓 `getAppIconPath()` 與
 * `preload` / `index.html` 路徑以啟動入口目錄為準（`main.js` 傳 `__dirname`）。
 * `sendWindowPower` 來自 `createMainIpcBridge`，所以要在它之後呼叫。
 */
function configureMainWindow(deps = {}) {
  if (typeof deps.sendWindowPower === "function") {
    sendWindowPower = deps.sendWindowPower;
  }
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
  gglEvent("main", "main_window_created", {});
  attachRendererFailureLog(mainWindow.webContents, gglError);

  // Debug 用：把 renderer 的 console 印到主程序
  // 平常不掛，避免噪音與 deprecated 警告
  if (getDebugLoggingEnabled()) {
    try {
      // 欄位掛在第一個參數（事件本身）上；level 是 info／warning／error／debug 字串
      // 〔electron.d.ts WebContentsConsoleMessageEventParams〕。讀第二個參數會拿到舊式的數字，訊息全空
      mainWindow.webContents.on("console-message", (details) => {
        const lvl = String(details?.level ?? "");
        const message = String(details?.message ?? "");
        const line = Number(details?.lineNumber ?? 0);
        const sourceId = String(details?.sourceId ?? "");
        console.log(`[RENDERER:${lvl}] ${message} (${sourceId}:${line})`);
      });
    } catch {}
  }

  mainWindow.loadFile(path.join(appRoot, "index.html"));
  // main/single-instance.js 依賴這裡的 show() 取得焦點（視窗顯示前的 second-instance 不另補）；
  // 改成 showInactive 或延後顯示的話，那邊要一起改。
  mainWindow.once("ready-to-show", () => {
    try {
      const w = getMainWindow();
      if (w && !w.isDestroyed()) w.show();
    } catch {}
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 只在 mainWindow 的事件裡呼叫：探針（Electron 44.3.0）裡這些事件沒有一次在 destroyed／closed 之後觸發
  // （→ _notes/plans/cross-review-2026-10-phase6b.md U-1）
  function sendWindowPowerState() {
    sendWindowPower(mainWindow.isMinimized());
  }

  // Renderer can pause background video more accurately with window state.
  mainWindow.on("minimize", sendWindowPowerState);
  mainWindow.on("restore", sendWindowPowerState);
  mainWindow.on("show", sendWindowPowerState);
  mainWindow.on("hide", sendWindowPowerState);
  mainWindow.on("focus", sendWindowPowerState);
  mainWindow.on("blur", sendWindowPowerState);
}

module.exports = {
  configureMainWindow,
  createMainWindow,
  getMainWindow,
  getAppIconPath,
};
