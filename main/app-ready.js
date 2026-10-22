/**
 * `app.whenReady` 本體：設定檔、主視窗、各子模組 `configure*`、IPC、輪詢與第一次狀態檢查。
 * 依賴全部由 `main.js` 注入，避免此檔與其它 main 模組形成難控的 require 順序／循環。
 *
 * @param {object} ctx
 */

const { gglEvent } = require("./ggl-log");

/** 與 `main.js` 的 `getMainAppReadyContext()` 鍵名一致；增刪注入時請兩邊一併改。 */
const MAIN_APP_READY_KEYS = [
  "app",
  "initSettingsAtBoot",
  "showSettingsRecoveredNotice",
  "computeDebugLoggingEnabled",
  "setDebugLoggingEnabled",
  "rotateLauncherLogIfTooLarge",
  "appendLauncherLog",
  "createMainWindow",
  "configureNetFetch",
  "configureMicrosoftAuth",
  "configureMinecraftLaunch",
  "configureServerStatus",
  "configureDiscordRpc",
  "setupMainIpc",
  "startServerStatusPolling",
  "startNoticeFeed",
  "getInstanceStatus",
  "sendSyncStatus",
  "sendMcStatus",
  "sendSyncDone",
  "sendMcRunning",
  "sendServerStatus",
  "getMainWindow",
  "getAppIconPath",
  "serverConfig",
  "tryStartDiscordRpcHelper",
];

/** 其餘欄位必須為 function（Electron `app` 與 `serverConfig` 為 object）。 */
const MAIN_APP_READY_NON_FN_KEYS = new Set(["app", "serverConfig"]);

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
      `runMainAppReady: ctx fields must be functions (except app / serverConfig): ${badType.join(", ")}`,
    );
  }
}

async function runMainAppReady(ctx) {
  if (!ctx || typeof ctx !== "object") {
    throw new Error("runMainAppReady: ctx is required");
  }
  assertMainAppReadyContext(ctx);
  gglEvent("main", "app_ready_begin", {});

  const {
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
    startNoticeFeed,
    getInstanceStatus,
    sendSyncStatus,
    sendMcStatus,
    sendSyncDone,
    sendMcRunning,
    sendServerStatus,
    getMainWindow,
    getAppIconPath,
    serverConfig,
    tryStartDiscordRpcHelper,
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

  // 設定檔讀不到或不合法 ⇒ 丟 SettingsError，start-main 交給 startup-failure 跳框（D-SET-UI）
  const { settings: initialSettings, recovered } = await initSettingsAtBoot({
    now: () => Date.now(),
  });

  // 初始化 debug log 開關（避免預設就寫檔）：直接用開機讀到的那份，不再另讀
  setDebugLoggingEnabled(computeDebugLoggingEnabled(initialSettings));
  await rotateLauncherLogIfTooLarge();
  await appendLauncherLog(`BOOT exe=${process.execPath}`);

  // 壞檔已備份並換成預設：主視窗之前告知一次（→ _notes/plans/cross-review-2026-10-phase4.md §開機）
  if (recovered) await showSettingsRecoveredNotice(recovered);

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
  });
  configureMicrosoftAuth({
    msClientId: serverConfig.microsoftAuth.clientId,
    loopbackPort: serverConfig.microsoftAuth.loopbackPort,
    getMainWindow,
    getAppIconPath,
    sendSyncStatus,
    sendSyncDone,
  });
  configureMinecraftLaunch({
    sendMcStatus,
    sendMcRunning,
    tryStartDiscordRpcHelper,
    log: appendLauncherLog,
  });
  configureServerStatus({
    sendServerStatus,
    serverStatusHost: serverConfig.serverStatus.host,
    serverStatusPort: serverConfig.serverStatus.port,
    serverStatusUrl: serverConfig.serverStatus.url,
  });
  configureDiscordRpc({ getMainWindow, discord: serverConfig.discord });
  setupMainIpc();
  startServerStatusPolling();
  startNoticeFeed();
  gglEvent("main", "app_ready_wired", { ipc: true });

  // 啟動時：只檢查狀態，不自動下載。中樞的計算不會 reject（出錯會送 internal-error）；
  // 畫面若還沒在聽，renderer:ready 時會重送
  setTimeout(() => {
    void getInstanceStatus();
  }, 350);
}

module.exports = { runMainAppReady };
