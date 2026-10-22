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
const { getPaths, DEFAULT_LAUNCHER_ROOT_DIR } = require("./paths");
const {
  initSettingsAtBoot,
  readSettings,
  writeSettings,
  copySettingsFileTo,
} = require("./settings");
const { recoveredNoticeText } = require("../lib/settings-format.js");
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

/**
 * 開機恢復了壞掉的設定檔：主視窗建立前告知一次（只有「確定」，不是 D-SET-UI 禁的修復視窗）。
 * 非致命：框跳不出來照樣開機（D-SET-RECOVER 接受「下次不一定再提示」）。
 */
async function showSettingsRecoveredNotice({ backupPath, why }) {
  const { dialog } = require("electron");
  try {
    await dialog.showMessageBox({
      type: "warning",
      title: "設定檔已換成預設值",
      message: "設定檔壞了，已換成預設值",
      detail: recoveredNoticeText({
        why,
        backupPath,
        defaultRootDir: DEFAULT_LAUNCHER_ROOT_DIR,
      }),
      buttons: ["確定"],
    });
  } catch (err) {
    // 告知失敗不擋開機：備份與恢復都已完成，留一筆常駐日誌
    gglError("main", "settings_recovered_notice_failed", err, {});
  }
}

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
    writeSettings,
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
        copySettingsFileTo,
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
    gglError,
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
    initSettingsAtBoot,
    showSettingsRecoveredNotice,
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
