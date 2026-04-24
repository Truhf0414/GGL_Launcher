// Main Process（Electron 主程序）
// 重要：此檔負責
// 1) 無邊框透明視窗 (Frameless + Transparent)（實作在 main/main-window.js）
// 2) 啟動時檢查伺服器端版本（不自動下載），點擊「安裝/更新」才同步實例
// 3) Minecraft（Fabric）啟動流程（實作在 main/minecraft-launch.js）
//
// 可調常數在 main/launcher-config.js；`app.ready` 編排在 main/app-ready.js；Discord helper 見 main/discord-rpc.js。

const { app } = require("electron");
const {
  computeDebugLoggingEnabled,
  setDebugLoggingEnabled,
  appendLauncherLog,
  rotateLauncherLogIfTooLarge,
  logSyncProgressThrottled,
} = require("./main/launcher-log");
const { readAccount } = require("./main/account-store");
const { getPaths } = require("./main/paths");
const {
  ensureSettingsFileInitialized,
  readSettings,
  readSettingsRaw,
  writeSettings,
  normalizeSettingsObject,
  isExplicitNumberLike,
} = require("./main/settings");
const {
  configureNotifications,
  readDismissedNotificationIds,
  writeDismissedNotificationIds,
  getBroadcastNotificationsCached,
  startNotificationsBroadcastPolling,
} = require("./main/notifications");
const {
  configureManifestSync,
  checkInstanceStatus,
  checkInstanceStatusAndNotify,
  installOrUpdateInstance,
  readInstanceMeta,
} = require("./main/manifest-sync");
const {
  configureNetFetch,
  fetchJson,
  fetchWithNiceError,
  downloadToFile,
} = require("./main/net-fetch");
const {
  configureMinecraftBootstrap,
  ensureMinecraftAndFabricRuntime,
  ensureBundledJava,
} = require("./main/minecraft-bootstrap");
const {
  configureMinecraftLaunch,
  ensureRuntimeAndLaunch,
  isMinecraftRunning,
} = require("./main/minecraft-launch");
const { configureMicrosoftAuth } = require("./main/microsoft-auth");
const { createMainIpcBridge } = require("./main/ipc-handlers");
const {
  configureServerStatus,
  startServerStatusPolling,
} = require("./main/server-status");
const {
  configureMainWindow,
  createMainWindow,
  getMainWindow,
  getAppIconPath,
} = require("./main/main-window");
const {
  configureDiscordRpc,
  tryStartDiscordRpcHelper,
} = require("./main/discord-rpc");
const { getSystemMemoryGb } = require("./main/system-memory");
const {
  getRemoteManifestUrl,
  serverStatusHost,
  serverStatusPort,
  serverStatusUrl,
  msClientId,
  loopbackPort,
  fabricLoaderVersion,
  isManifestUrlConfigured,
} = require("./main/launcher-config");
const { exportDiagnostics } = require("./main/diagnostics-export");
const { runMainAppReady } = require("./main/app-ready");

configureMainWindow({ appRoot: __dirname });

const {
  sendSyncStatus,
  sendSyncProgress,
  sendSyncDone,
  sendMcStatus,
  sendMcProgress,
  sendMcRunning,
  sendInstanceStatus,
  sendServerStatus,
  setupMainIpc,
} = createMainIpcBridge({
  getMainWindow,
  appendLauncherLog,
  logSyncProgressThrottled,
  readAccount,
  readSettings,
  readSettingsRaw,
  writeSettings,
  normalizeSettingsObject,
  isExplicitNumberLike,
  getSystemMemoryGb,
  getPaths,
  checkInstanceStatus,
  ensureRuntimeAndLaunch,
  isMinecraftRunning,
  installOrUpdateInstance,
  checkInstanceStatusAndNotify,
  isManifestUrlConfigured,
  getRemoteManifestUrl,
  fetchJson,
  exportDiagnostics: () =>
    exportDiagnostics({
      readSettings,
      getPaths,
      readInstanceMeta,
      getRemoteManifestUrl,
      isManifestUrlConfigured,
      fetchJson,
    }),
  getBroadcastNotificationsCached,
  readDismissedNotificationIds,
  writeDismissedNotificationIds,
});

/** 回傳鍵須與 `main/app-ready.js` 的 `MAIN_APP_READY_KEYS` 一致（啟動時會先 assert）。 */
function getMainAppReadyContext() {
  return {
    app,
    ensureSettingsFileInitialized,
    readSettings,
    computeDebugLoggingEnabled,
    setDebugLoggingEnabled,
    rotateLauncherLogIfTooLarge,
    appendLauncherLog,
    createMainWindow,
    configureNetFetch,
    configureMicrosoftAuth,
    configureMinecraftBootstrap,
    configureMinecraftLaunch,
    configureNotifications,
    configureManifestSync,
    configureServerStatus,
    configureDiscordRpc,
    setupMainIpc,
    startServerStatusPolling,
    startNotificationsBroadcastPolling,
    sendSyncStatus,
    sendMcStatus,
    sendSyncProgress,
    sendSyncDone,
    sendMcProgress,
    sendMcRunning,
    sendInstanceStatus,
    sendServerStatus,
    getMainWindow,
    getAppIconPath,
    fetchJson,
    fetchWithNiceError,
    downloadToFile,
    getRemoteManifestUrl,
    isManifestUrlConfigured,
    msClientId,
    loopbackPort,
    fabricLoaderVersion,
    ensureMinecraftAndFabricRuntime,
    tryStartDiscordRpcHelper,
    ensureBundledJava,
    serverStatusHost,
    serverStatusPort,
    serverStatusUrl,
    checkInstanceStatusAndNotify,
  };
}

app.whenReady().then(() =>
  runMainAppReady(getMainAppReadyContext()).catch((err) => {
    console.error("[MAIN_APP_READY]", err);
    try {
      void appendLauncherLog(`BOOT failed: ${String(err?.stack ?? err)}`);
    } catch {}
  }),
);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// manifest.json 範例與欄位說明：見 ARCHITECTURE.md；同步實作在 main/manifest-sync.js。
