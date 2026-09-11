// Main startup wiring (composition root).
// main.js should only own Electron app lifecycle; this module does the wiring.

const {
  computeDebugLoggingEnabled,
  setDebugLoggingEnabled,
  appendLauncherLog,
  rotateLauncherLogIfTooLarge,
  logSyncProgressThrottled,
} = require("./launcher-log");
const { readAccount } = require("./account-store");
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
  configureNotifications,
  readDismissedNotificationIds,
  writeDismissedNotificationIds,
  getBroadcastNotificationsCached,
  startNotificationsBroadcastPolling,
} = require("./notifications");
const {
  configureManifestSync,
  checkInstanceStatus,
  checkInstanceStatusAndNotify,
  installOrUpdateInstance,
  readInstanceMeta,
} = require("./manifest-sync");
const {
  configureNetFetch,
  fetchJson,
  fetchWithNiceError,
  downloadToFile,
} = require("./net-fetch");
const {
  configureMinecraftBootstrap,
  ensureMinecraftAndFabricRuntime,
  ensureBundledJava,
} = require("./minecraft-bootstrap");
const {
  configureMinecraftLaunch,
  ensureRuntimeAndLaunch,
  isMinecraftRunning,
} = require("./minecraft-launch");
const {
  configureMicrosoftAuth,
  checkStoredTokenStillValid,
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
const {
  getRemoteManifestUrl,
  serverStatusHost,
  serverStatusPort,
  serverStatusUrl,
  msClientId,
  loopbackPort,
  fabricLoaderVersion,
  isManifestUrlConfigured,
} = require("./launcher-config");
const { exportDiagnostics } = require("./diagnostics-export");
const { runMainAppReady } = require("./app-ready");
const { gglEvent, gglError } = require("../lib/ggl-structured-log");

function createMainAppReadyContext({ app, appRoot }) {
  configureMainWindow({ appRoot });

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
    checkStoredTokenStillValid,
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

async function startMain({ app, appRoot }) {
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
    try {
      void appendLauncherLog(`BOOT failed: ${String(err?.stack ?? err)}`);
    } catch {}
  }
}

module.exports = { startMain };
