// Main startup wiring (composition root).
// main.js should only own Electron app lifecycle; this module does the wiring.

const {
  computeDebugLoggingEnabled,
  setDebugLoggingEnabled,
  appendLauncherLog,
  rotateLauncherLogIfTooLarge,
  logSyncProgressThrottled,
} = require("./launcher-log");
const { readAccount, writeAccount } = require("./account-store");
const { getPaths } = require("./paths");
const {
  ensureSettingsFileInitialized,
  readSettings,
  readSettingsRaw,
  writeSettings,
  normalizeSettingsObject,
  isExplicitNumberLike,
} = require("./settings");
const {
  readDismissedNotificationIds,
  writeDismissedNotificationIds,
} = require("./notifications");
const { configureNetFetch, fetchJson } = require("./net-fetch");
const { createInstanceSync } = require("./sync/index.js");
const { createSiteClient } = require("./sync/site-client.js");
const { createNoticeFeed } = require("./sync/notice-feed.js");
const { readRecord: readSyncRecord } = require("./sync/instance-record.js");
const { createConfirmGameClosed } = require("./game-closed-dialog");
const { describeProgress } = require("../lib/sync/status-text.js");
const {
  configureMinecraftLaunch,
  launchMinecraft,
  isMinecraftRunning,
} = require("./minecraft-launch");
const {
  configureMicrosoftAuth,
  refreshMicrosoftAndMinecraftTokens,
} = require("./microsoft-auth");

const { createMainIpcBridge } = require("./ipc-setup");
const {
  configureServerStatus,
  startServerStatusPolling,
} = require("./server-status");
const {
  configureMainWindow,
  createMainWindow,
  getMainWindow,
  getAppIconPath,
} = require("./main-window");
const {
  configureDiscordRpc,
  tryStartDiscordRpcHelper,
} = require("./discord-rpc");
const { getSystemMemoryGb } = require("./system-memory");
const serverConfig = require("../lib/server-config.js");
const {
  isRemoteManifestUrlConfigured,
} = require("../lib/manifest-url-configured.js");
const { exportDiagnostics } = require("./diagnostics-export");
const { runMainAppReady } = require("./app-ready");
const { gglEvent, gglError } = require("./ggl-log");

const getRemoteManifestUrl = () => serverConfig.manifestUrl;
const isManifestUrlConfigured = () =>
  isRemoteManifestUrlConfigured(serverConfig.manifestUrl);

function createMainAppReadyContext({ app, appRoot }) {
  // 中樞與公告模組共用一個 site-client 與同一個 serverConfig。
  // 送畫面的函式來自之後才建的 bridge：晚綁定（bridge 的 handler 又要用中樞）。
  let bridge = null;
  const siteClient = createSiteClient();
  const instanceSync = createInstanceSync({
    readSettings,
    isMinecraftRunning,
    log: appendLauncherLog,
    sendInstanceStatus: (status) => bridge.sendInstanceStatus(status),
    confirmGameClosed: createConfirmGameClosed({
      dialog: require("electron").dialog,
      getMainWindow,
    }),
    launcherVersion: String(require("../package.json").version || "").trim(),
    siteClient,
    serverConfig,
    // describeProgress 永不丟錯：進度回呼丟錯會打斷套用
    onProgress: (p) => {
      const { text, progress01 } = describeProgress(p);
      bridge.sendSyncProgress(text, progress01);
    },
  });
  const noticeFeed = createNoticeFeed({
    siteClient,
    serverConfig,
    onChange: (snapshot) => bridge.sendNotice(snapshot),
    log: (err) => appendLauncherLog("NOTICE_ERROR " + (err?.stack ?? err)),
  });

  bridge = createMainIpcBridge({
    getMainWindow,
    appendLauncherLog,
    logSyncProgressThrottled,
    readAccount,
    writeAccount,
    refreshMicrosoftAndMinecraftTokens,
    readSettings,
    readSettingsRaw,
    writeSettings,
    normalizeSettingsObject,
    isExplicitNumberLike,
    getSystemMemoryGb,
    getPaths,
    launchMinecraft,
    isMinecraftRunning,
    getInstanceStatus: instanceSync.getInstanceStatus,
    updateInstance: instanceSync.updateInstance,
    repairInstance: instanceSync.repairInstance,
    listStrayJars: instanceSync.listStrayJars,
    withLaunchLock: instanceSync.withLaunchLock,
    getLockHolder: instanceSync.getLockHolder,
    exportDiagnostics: () =>
      exportDiagnostics({
        readSettings,
        getPaths,
        readSyncRecord,
        getRemoteManifestUrl,
        isManifestUrlConfigured,
        fetchJson,
      }),
    getNotifications: () => noticeFeed.get().notifications,
    readDismissedNotificationIds,
    writeDismissedNotificationIds,
    serverConfig,
  });
  const {
    sendSyncStatus,
    sendSyncDone,
    sendMcStatus,
    sendMcRunning,
    sendServerStatus,
    sendWindowPower,
    setupMainIpc,
  } = bridge;
  configureMainWindow({ appRoot, sendWindowPower });

  /** 回傳鍵須與 `main/app-ready.js` 的 `MAIN_APP_READY_KEYS` 一致（啟動時會先 assert）。 */
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
    configureMinecraftLaunch,
    configureServerStatus,
    configureDiscordRpc,
    setupMainIpc,
    startServerStatusPolling,
    startNoticeFeed: noticeFeed.start,
    getInstanceStatus: instanceSync.getInstanceStatus,
    sendSyncStatus,
    sendMcStatus,
    sendSyncDone,
    sendMcRunning,
    sendServerStatus,
    getMainWindow,
    getAppIconPath,
    serverConfig,
    tryStartDiscordRpcHelper,
  };
}

/**
 * @param {{ app: Electron.App, appRoot: string, onStartupFailed: (err: unknown) => void }} opts
 *   onStartupFailed：啟動失敗時呼叫（main.js 接 main/startup-failure.js：錯誤框＋結束行程）
 */
async function startMain({ app, appRoot, onStartupFailed }) {
  gglEvent("main", "start_main_begin", {
    node: process.version,
    platform: process.platform,
  });
  try {
    const ctx = createMainAppReadyContext({ app, appRoot });
    await runMainAppReady(ctx);
    gglEvent("main", "start_main_done", {});
  } catch (err) {
    gglError("main", "start_main_failed", err, {});
    console.error("[MAIN_APP_READY]", err);
    // 等 log 寫完再報：接下來會結束行程（appendLauncherLog 自己吞錯）
    await appendLauncherLog(`BOOT failed: ${String(err?.stack ?? err)}`);
    onStartupFailed(err);
  }
}

module.exports = { startMain };
