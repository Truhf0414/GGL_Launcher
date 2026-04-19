/**
 * `app.whenReady` 本體：設定檔、主視窗、各子模組 `configure*`、IPC、輪詢與延遲版本檢查。
 * 依賴全部由 `main.js` 注入，避免此檔與其它 main 模組形成難控的 require 順序／循環。
 *
 * @param {object} ctx
 */

/** 與 `main.js` 的 `getMainAppReadyContext()` 鍵名一致；增刪注入時請兩邊一併改。 */
const MAIN_APP_READY_KEYS = [
  "app",
  "ensureSettingsFileInitialized",
  "readSettings",
  "computeDebugLoggingEnabled",
  "setDebugLoggingEnabled",
  "rotateLauncherLogIfTooLarge",
  "appendLauncherLog",
  "createMainWindow",
  "configureNetFetch",
  "configureMicrosoftAuth",
  "configureMinecraftBootstrap",
  "configureMinecraftLaunch",
  "configureNotifications",
  "configureManifestSync",
  "configureServerStatus",
  "configureDiscordRpc",
  "setupMainIpc",
  "startServerStatusPolling",
  "startNotificationsBroadcastPolling",
  "sendSyncStatus",
  "sendMcStatus",
  "sendSyncProgress",
  "sendSyncDone",
  "sendMcProgress",
  "sendMcRunning",
  "sendInstanceStatus",
  "sendServerStatus",
  "getMainWindow",
  "getAppIconPath",
  "fetchJson",
  "fetchWithNiceError",
  "downloadToFile",
  "getRemoteManifestUrl",
  "isManifestUrlConfigured",
  "msClientId",
  "loopbackPort",
  "fabricLoaderVersion",
  "ensureMinecraftAndFabricRuntime",
  "tryStartDiscordRpcHelper",
  "ensureBundledJava",
  "serverStatusHost",
  "serverStatusPort",
  "serverStatusUrl",
  "checkInstanceStatusAndNotify",
];

/** 其餘欄位必須為 function（Electron `app` 為 object）。 */
const MAIN_APP_READY_NON_FN_KEYS = new Set([
  "app",
  "msClientId",
  "loopbackPort",
  "fabricLoaderVersion",
  "serverStatusHost",
  "serverStatusPort",
  "serverStatusUrl",
]);

function assertMainAppReadyContext(ctx) {
  const missing = [];
  for (const k of MAIN_APP_READY_KEYS) {
    if (!(k in ctx) || ctx[k] === undefined || ctx[k] === null) {
      missing.push(k);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `runMainAppReady: missing or null ctx keys: ${missing.join(", ")}`,
    );
  }
  if (!ctx.app || typeof ctx.app !== "object") {
    throw new Error("runMainAppReady: ctx.app must be a non-null object");
  }
  const badType = [];
  for (const k of MAIN_APP_READY_KEYS) {
    if (MAIN_APP_READY_NON_FN_KEYS.has(k)) continue;
    if (typeof ctx[k] !== "function") {
      badType.push(`${k}(${typeof ctx[k]})`);
    }
  }
  if (badType.length > 0) {
    throw new Error(
      `runMainAppReady: ctx fields must be functions (except app / launcher constants): ${badType.join(", ")}`,
    );
  }
}

async function runMainAppReady(ctx) {
  if (!ctx || typeof ctx !== "object") {
    throw new Error("runMainAppReady: ctx is required");
  }
  assertMainAppReadyContext(ctx);

  const {
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
  } = ctx;

  const safeSendSyncStatus = (text) => {
    try {
      sendSyncStatus(text);
    } catch {}
  };

  try {
    // 與 electron-builder 的 build.appId 對齊，避免工作列/通知識別不一致
    app.setAppUserModelId("ggl3.launcher");
  } catch {}

  await ensureSettingsFileInitialized();

  // 初始化 debug log 開關（避免預設就寫檔）
  const initialSettings = await readSettings();
  setDebugLoggingEnabled(computeDebugLoggingEnabled(initialSettings));
  await rotateLauncherLogIfTooLarge();
  await appendLauncherLog(`BOOT exe=${process.execPath}`);

  createMainWindow();
  // 先注入子模組依賴再註冊 IPC，避免 renderer 極早 invoke 時踩到未配置的 deps stub
  configureNetFetch({
    onRetryNotify: (text) => {
      safeSendSyncStatus(text);
      try {
        sendMcStatus(text);
      } catch {}
    },
    appendLauncherLog,
    sendMirrorStatus: safeSendSyncStatus,
  });
  configureMicrosoftAuth({
    msClientId,
    loopbackPort,
    getMainWindow,
    getAppIconPath,
    sendSyncStatus,
    sendSyncDone,
  });
  configureMinecraftBootstrap({
    sendMcStatus,
    sendMcProgress,
    sendSyncStatus,
    sendSyncProgress,
  });
  configureMinecraftLaunch({
    sendMcStatus,
    sendMcRunning,
    getMainWindow,
    tryStartDiscordRpcHelper,
    fabricLoaderVersion,
    ensureMinecraftAndFabricRuntime,
  });
  configureNotifications({
    getMainWindow,
    fetchJson,
    getRemoteManifestUrl,
    isManifestUrlConfigured,
  });
  configureManifestSync({
    getRemoteManifestUrl,
    isManifestUrlConfigured,
    fetchJson,
    fetchWithNiceError,
    downloadToFile,
    sendSyncStatus,
    sendSyncProgress,
    sendSyncDone,
    sendInstanceStatus,
    ensureBundledJava,
  });
  configureServerStatus({
    sendServerStatus,
    serverStatusHost,
    serverStatusPort,
    serverStatusUrl,
  });
  configureDiscordRpc({ getMainWindow });
  setupMainIpc();
  startServerStatusPolling();
  startNotificationsBroadcastPolling();
  // 啟動時：只做「版本檢查」，不自動下載
  setTimeout(() => {
    checkInstanceStatusAndNotify().catch((e) => {
      const msg = String(e?.message ?? e);
      sendSyncStatus(`版本檢查失敗：${msg}`);
      try {
        sendSyncDone("版本檢查失敗");
      } catch {}
      sendInstanceStatus({
        state: "error",
        fetchFailed: true,
        needsInstall: true,
        needsUpdate: false,
        noUpdateSource: false,
        localVersion: "",
        remoteVersion: "",
        notice: null,
        text: "版本檢查失敗（可按「重試連線」再試）",
      });
    });
  }, 350);
}

module.exports = { runMainAppReady };
