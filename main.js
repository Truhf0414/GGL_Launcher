// Main Process（Electron 主程序）
// 重要：此檔負責
// 1) 無邊框透明視窗 (Frameless + Transparent)
// 2) 啟動時檢查伺服器端版本（不自動下載），點擊「安裝/更新」才同步實例
// 3) Minecraft（Fabric 1.21.1）Java 啟動骨架（優先使用內建 jdk）
//
// 你是新手也沒關係：我把可改的地方用「TODO」標出來。

const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");
const { spawn } = require("child_process");
const http = require("http");
const { URL, URLSearchParams } = require("url");

// =========================
// Launcher log（避免被遊戲日誌洗掉）
// =========================
function getLauncherLogPath() {
  // 預設放桌面，方便使用者直接抓檔（可依需求改回 userData）
  return path.join(app.getPath("desktop"), "launcher.log");
}

// Debug log 開關：
// - 預設關閉（不寫任何檔案）
// - 可透過 settings.debugLogging = true 開啟
// - 或設定環境變數 GGL_DEBUG_LOG=1 / true 開啟（方便在 CI/命令列）
let debugLoggingEnabled = false;
function computeDebugLoggingEnabled(settings) {
  const env = String(process.env.GGL_DEBUG_LOG || "")
    .trim()
    .toLowerCase();
  const envOn = env === "1" || env === "true" || env === "yes" || env === "on";
  const sOn = Boolean(settings?.debugLogging);
  return envOn || sOn;
}

async function appendLauncherLog(line) {
  if (!debugLoggingEnabled) return;
  try {
    const ts = new Date().toISOString();
    await fsp.mkdir(path.dirname(getLauncherLogPath()), { recursive: true });
    await fsp.appendFile(
      getLauncherLogPath(),
      `[${ts}] ${String(line).replace(/\r?\n/g, " ")}\n`,
      "utf8",
    );
  } catch {}
}

async function appendRpcDiagLog(line) {
  // 僅在 debugLoggingEnabled 時寫入（避免正常使用時產生多餘檔案）
  if (!debugLoggingEnabled) return;
  try {
    const p = path.join(app.getPath("userData"), "rpc-launch.log");
    const ts = new Date().toISOString();
    await fsp.mkdir(path.dirname(p), { recursive: true });
    await fsp.appendFile(
      p,
      `[${ts}] ${String(line).replace(/\r?\n/g, " ")}\n`,
      "utf8",
    );
  } catch {}
}

async function rotateLauncherLogIfTooLarge(maxBytes = 6 * 1024 * 1024) {
  if (!debugLoggingEnabled) return;
  try {
    const p = getLauncherLogPath();
    const st = await fsp.stat(p);
    if (!st.isFile()) return;
    if (st.size <= maxBytes) return;
    const bak = p.replace(/\.log$/i, ".1.log");
    try {
      await fsp.rm(bak, { force: true });
    } catch {}
    await fsp.rename(p, bak);
  } catch {}
}

const _logThrottle = {
  syncText: "",
  syncPctBucket: -1,
};

function logSyncProgressThrottled(text, progress01) {
  // 避免 downloadToFile 的 onChunk 狂刷磁碟
  const pct = Math.max(0, Math.min(1, Number(progress01) || 0)) * 100;
  const bucket = Math.floor(pct / 5); // 每 5% 記一次
  if (
    String(text) !== _logThrottle.syncText ||
    bucket !== _logThrottle.syncPctBucket
  ) {
    _logThrottle.syncText = String(text);
    _logThrottle.syncPctBucket = bucket;
    void appendLauncherLog(`SYNC ${text} ${pct.toFixed(1)}%`);
  }
}

// =========================
// (A) 你要改的遠端 manifest 連結（實例清單）
// =========================
// TODO: 把這個 URL 換成你 Web Server / 雲端空間上的 manifest.json
// 這個 manifest 用來描述「要安裝的實例」以及「伺服器端最新版本」。
const remoteManifestUrl = "https://ggl3.ddns.net/manifest.json";

// =========================
// 伺服器狀態檢查（Online / Offline）
// =========================
// Minecraft 伺服器通常不是 HTTP，因此預設用 TCP 測試連線（能連到 port 就視為 Online）。
// 你也可以改用 HTTP health URL（如果你自己有做）。
const serverStatusHost = "ggl3.ddns.net";
const serverStatusPort = 25565;
// 可選：若你有 health 網址，填在這裡（會優先用 HTTP）
const serverStatusUrl = "";

function isServerStatusConfigured() {
  if (String(serverStatusUrl || "").trim()) return true;
  return (
    Boolean(String(serverStatusHost || "").trim()) &&
    Number(serverStatusPort) > 0
  );
}

// =========================
// (LOGIN) Microsoft OAuth（需要你填 client id）
// =========================
// TODO: 你需要在 Azure Portal 建立「Microsoft identity platform」App，
// 取得 client_id，並啟用 Redirect URI: http://localhost (http)
// 這樣才能讓 Electron 打開 Microsoft 登入並拿到授權碼。
const msClientId = "9d61536d-3658-4565-98b3-170cb8ac37a1";
// 為了讓 Azure Redirect URI 好設定，我們使用固定的 loopback port。
// 你只要在 Azure 的 Redirect URI 填：http://localhost:49152/callback
const loopbackPort = 49152;

function isManifestUrlConfigured() {
  const u = String(remoteManifestUrl || "").trim();
  if (!u) return false;
  if (/^https?:\/\/example\.com\/manifest\.json$/i.test(u)) return false;
  return true;
}

// =========================
// (A) 啟動器本地目錄（仿你提到的啟動器結構）
// =========================
// 需求：使用者可指定目錄位置（預設 C:\GGL）
// 會建立：
// <root>\group   -> Minecraft 實例（每個實例一個資料夾）
// <root>\jdk     -> 內建 Java（放入 JDK 解壓內容）
// <root>\.temp   -> 暫存下載檔/中繼檔（避免下載中斷時破壞實例）
//
// 注意：這些路徑會從 settings.launcherRootDir 取得。
const instanceId = "GGL"; // 實例資料夾名（可之後再做多實例）
// 你指定的 Fabric Loader 版本（依你提供：0.18.6）
const fabricLoaderVersion = "0.18.6";

function normalizeRootDir(v) {
  const s = String(v || "").trim();
  return s || "C:\\GGL";
}

function getPaths(settings) {
  const root = normalizeRootDir(settings?.launcherRootDir);
  const groupDir = path.join(root, "group");
  const jdkDir = path.join(root, "jdk");
  const tempDir = path.join(root, ".temp");
  const instanceDir = path.join(groupDir, instanceId);
  const gameDir = path.join(instanceDir, ".minecraft");
  const instanceMetaPath = path.join(instanceDir, "instance.json");
  return {
    root,
    groupDir,
    jdkDir,
    tempDir,
    instanceDir,
    gameDir,
    instanceMetaPath,
  };
}

async function migrateLegacyInstanceFolderIfNeeded(paths) {
  // 兼容：舊版 instanceId=catnip，改成 GGL 後自動搬移，避免使用者重裝
  const legacyDir = path.join(paths.groupDir, "catnip");
  if (legacyDir === paths.instanceDir) return;
  try {
    await fsp.access(legacyDir, fs.constants.F_OK);
  } catch {
    return; // 沒舊資料夾
  }
  try {
    await fsp.access(paths.instanceDir, fs.constants.F_OK);
    return; // 新資料夾已存在就不動
  } catch {}

  sendSyncStatus("正在搬移舊實例資料夾…");
  sendSyncProgress("正在搬移舊實例資料夾…", 0.01);
  await fsp.mkdir(paths.groupDir, { recursive: true });
  await fsp.rename(legacyDir, paths.instanceDir);
}

// 設定檔（存 Java 路徑、記憶體 GB、playerId）
function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function resolveDefaultSettingsPath() {
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  return path.join(base, "assets", "default-settings.json");
}

async function readDefaultSettingsOrFallback() {
  try {
    const raw = await fsp.readFile(resolveDefaultSettingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // minimal safe defaults (only fields used by launcher bootstrap / RPC)
    return {
      minecraftVersion: "1.21.11",
      launcherRootDir: "C:\\GGL",
      memoryGb: 4,
      playerId: "Player001",
      debugLogging: false,
      discordClientId: "1494225911321595945",
      discordLargeImageKey: "ggl",
      discordLargeImageText: "GGL",
      discordStateText: "GGL3 麥塊模組伺服器",
      discordButtonJoinServerUrl: "",
      discordButtonDownloadLauncherUrl: "",
    };
  }
}

function mergeMissingDefaults(cur, defaults) {
  const out = { ...(cur && typeof cur === "object" ? cur : {}) };
  let changed = false;
  const d = defaults && typeof defaults === "object" ? defaults : {};
  for (const [k, v] of Object.entries(d)) {
    if (!(k in out)) {
      out[k] = v;
      changed = true;
    }
  }
  return { merged: out, changed };
}

function normalizeString(v, fallback = "") {
  const s = typeof v === "string" ? v : "";
  const t = s.trim();
  return t || fallback;
}

function normalizeNullableNumber(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeAllowedHosts(v) {
  // allow: [] or ["example.com"] or "a.com,b.com"
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        String(x || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
  }
  const s = String(v || "").trim();
  if (!s) return [];
  return s
    .split(/[,\s]+/g)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeSettingsObject(obj) {
  const o = obj && typeof obj === "object" ? obj : {};
  const memoryGb = Number.isFinite(Number(o.memoryGb)) ? Number(o.memoryGb) : 4;
  const minMemoryGb = normalizeNullableNumber(o.minMemoryGb);
  const maxMemoryGb = normalizeNullableNumber(o.maxMemoryGb);

  const out = {
    // keep unknown keys as-is (forward compatible)
    ...o,

    javaPath: typeof o.javaPath === "string" ? o.javaPath : "",
    memoryGb: Math.max(1, Math.min(64, memoryGb)),
    minMemoryGb:
      minMemoryGb === null ? null : Math.max(0, Math.min(64, minMemoryGb)),
    maxMemoryGb:
      maxMemoryGb === null ? null : Math.max(1, Math.min(64, maxMemoryGb)),
    playerId: normalizeString(o.playerId, "Player001"),
    launcherRootDir: normalizeString(o.launcherRootDir, "C:\\GGL"),
    debugLogging: Boolean(o.debugLogging),

    preferredJavaMirrorName:
      typeof o.preferredJavaMirrorName === "string"
        ? o.preferredJavaMirrorName
        : "",
    preferredJavaMirrorUrl:
      typeof o.preferredJavaMirrorUrl === "string"
        ? o.preferredJavaMirrorUrl
        : "",
    preferredJavaMirrorAt: Number.isFinite(Number(o.preferredJavaMirrorAt))
      ? Number(o.preferredJavaMirrorAt)
      : 0,
    preferredMcMirrorName:
      typeof o.preferredMcMirrorName === "string"
        ? o.preferredMcMirrorName
        : "",
    preferredMcMirrorBase:
      typeof o.preferredMcMirrorBase === "string"
        ? o.preferredMcMirrorBase
        : "",
    preferredMcMirrorAt: Number.isFinite(Number(o.preferredMcMirrorAt))
      ? Number(o.preferredMcMirrorAt)
      : 0,

    minecraftVersion: normalizeString(
      o.minecraftVersion || o.minecraftVersion,
      "1.21.11",
    ),

    discordClientId:
      typeof o.discordClientId === "string" ? o.discordClientId.trim() : "",
    discordLargeImageKey: normalizeString(o.discordLargeImageKey, "ggl"),
    discordLargeImageText: normalizeString(o.discordLargeImageText, "GGL"),
    discordStateText: normalizeString(
      o.discordStateText,
      "GGL3 麥塊模組伺服器",
    ),
    discordButtonJoinServerUrl:
      typeof o.discordButtonJoinServerUrl === "string"
        ? o.discordButtonJoinServerUrl.trim()
        : "",
    discordButtonDownloadLauncherUrl:
      typeof o.discordButtonDownloadLauncherUrl === "string"
        ? o.discordButtonDownloadLauncherUrl.trim()
        : "",
    discordAllowedButtonHosts: normalizeAllowedHosts(
      o.discordAllowedButtonHosts,
    ),
  };

  // if min > max, drop min to avoid invalid JVM args
  if (
    out.minMemoryGb !== null &&
    out.maxMemoryGb !== null &&
    out.minMemoryGb > out.maxMemoryGb
  ) {
    out.minMemoryGb = null;
  }
  return out;
}

function filterButtonUrl(url, allowedHosts) {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u)) return "";
  if (!allowedHosts || allowedHosts.length === 0) return u;
  try {
    const host = new URL(u).hostname.toLowerCase();
    return allowedHosts.includes(host) ? u : "";
  } catch {
    return "";
  }
}

async function ensureSettingsFileInitialized() {
  const settingsPath = getSettingsPath();
  const defaults = await readDefaultSettingsOrFallback();

  let curRaw = "";
  try {
    curRaw = await fsp.readFile(settingsPath, "utf8");
  } catch {
    // not exists -> create from defaults
    try {
      await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
      await fsp.writeFile(
        settingsPath,
        JSON.stringify(normalizeSettingsObject(defaults), null, 2),
        "utf8",
      );
      return true;
    } catch {
      return false;
    }
  }

  // exists -> merge missing keys only (do not overwrite user values)
  try {
    const cur = JSON.parse(curRaw);
    const { merged, changed } = mergeMissingDefaults(cur, defaults);
    if (!changed) return false;
    await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
    await fsp.writeFile(
      settingsPath,
      JSON.stringify(normalizeSettingsObject(merged), null, 2),
      "utf8",
    );
    return true;
  } catch {
    // corrupted settings -> rewrite defaults
    try {
      await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
      await fsp.writeFile(
        settingsPath,
        JSON.stringify(normalizeSettingsObject(defaults), null, 2),
        "utf8",
      );
      return true;
    } catch {
      return false;
    }
  }
}

async function readSettings() {
  try {
    const raw = await fsp.readFile(getSettingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    return normalizeSettingsObject(parsed);
  } catch {
    return normalizeSettingsObject({});
  }
}

function sendRpcNotice(text) {
  try {
    mainWindow?.webContents?.send("rpc:notice", { text: String(text || "") });
  } catch {}
}

function resolveDiscordRpcHelperExePath() {
  // dev：專案根目錄 / packaged：resourcesPath（由打包器配置 extraResources）
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  return path.join(base, "assets", "rpc-helper.exe");
}

function getDiscordClientIdFromEnvOrSettings(settings) {
  const env = String(process.env.GGL_DISCORD_CLIENT_ID || "").trim();
  if (env) return env;
  return String(settings?.discordClientId || "").trim();
}

async function tryStartDiscordRpcHelper({ settings, mcPid }) {
  const clientId = getDiscordClientIdFromEnvOrSettings(settings);
  if (!clientId) {
    void appendRpcDiagLog(
      "skip: missing discordClientId (or env GGL_DISCORD_CLIENT_ID)",
    );
    sendRpcNotice("Discord 狀態未啟用（未設定 Client ID）");
    return;
  }

  const helperExe = resolveDiscordRpcHelperExePath();
  try {
    await fsp.access(helperExe, fs.constants.F_OK);
  } catch {
    // helper 未打包/未放置時不要中斷遊戲啟動
    void appendLauncherLog(`DISCORD_RPC helper missing: ${helperExe}`);
    void appendRpcDiagLog(`skip: helper missing: ${helperExe}`);
    sendRpcNotice("Discord 狀態未啟用（找不到 RPC helper）");
    return;
  }

  const userData = app.getPath("userData");
  const helperLogPath = path.join(userData, "rpc-helper.log");
  const lockPath = path.join(userData, "rpc-helper.lock");
  const statusPath = path.join(userData, "rpc-helper.status.json");
  const allowedHosts = Array.isArray(settings?.discordAllowedButtonHosts)
    ? settings.discordAllowedButtonHosts
    : [];

  const joinUrl = filterButtonUrl(
    settings?.discordButtonJoinServerUrl || "",
    allowedHosts,
  );
  const dlUrl = filterButtonUrl(
    settings?.discordButtonDownloadLauncherUrl || "",
    allowedHosts,
  );
  const args = [
    "--clientId",
    clientId,
    "--pid",
    String(mcPid),
    "--stateText",
    String(settings?.discordStateText || "GGL3 麥塊模組伺服器"),
    "--largeImageKey",
    String(settings?.discordLargeImageKey || "ggl"),
    "--largeImageText",
    String(settings?.discordLargeImageText || "GGL"),
    "--button1Label",
    "加入伺服器",
    "--button1Url",
    String(joinUrl || ""),
    "--button2Label",
    "下載啟動器",
    "--button2Url",
    String(dlUrl || ""),
    "--lockPath",
    lockPath,
    "--debug",
    debugLoggingEnabled ? "1" : "0",
    ...(debugLoggingEnabled
      ? ["--selfLogPath", helperLogPath, "--statusPath", statusPath]
      : []),
  ];

  try {
    const p = spawn(helperExe, args, {
      detached: true,
      windowsHide: true,
      stdio: "ignore",
    });
    p.unref();
    void appendLauncherLog(
      `DISCORD_RPC started pid=${p.pid} helper=${helperExe}`,
    );
    void appendRpcDiagLog(
      `started helper pid=${p.pid} mcPid=${mcPid} helper=${helperExe}`,
    );
  } catch (e) {
    void appendLauncherLog(
      `DISCORD_RPC start failed: ${String(e?.message ?? e)}`,
    );
    void appendRpcDiagLog(`start failed: ${String(e?.message ?? e)}`);
    sendRpcNotice("Discord 狀態啟動失敗（helper 無法啟動）");
  }
}

async function writeSettings(patch) {
  const cur = await readSettings();
  const next = normalizeSettingsObject({
    ...cur,
    ...(patch && typeof patch === "object" ? patch : {}),
  });
  await fsp.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fsp.writeFile(getSettingsPath(), JSON.stringify(next, null, 2), "utf8");
  debugLoggingEnabled = computeDebugLoggingEnabled(next);
  return next;
}

function getAccountPath() {
  return path.join(app.getPath("userData"), "account.json");
}

function getNotificationsPath() {
  return path.join(app.getPath("userData"), "notifications.json");
}

async function readNotifications() {
  try {
    const raw = await fsp.readFile(getNotificationsPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeNotifications(list) {
  await fsp.mkdir(path.dirname(getNotificationsPath()), { recursive: true });
  await fsp.writeFile(
    getNotificationsPath(),
    JSON.stringify(list, null, 2),
    "utf8",
  );
}

async function readAccount() {
  try {
    const raw = await fsp.readFile(getAccountPath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      loggedIn: Boolean(parsed.loggedIn),
      name: typeof parsed.name === "string" ? parsed.name : "",
      uuid: typeof parsed.uuid === "string" ? parsed.uuid : "",
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : "",
      mcAccessToken:
        typeof parsed.mcAccessToken === "string" ? parsed.mcAccessToken : "",
    };
  } catch {
    return {
      loggedIn: false,
      name: "",
      uuid: "",
      avatarUrl: "",
      mcAccessToken: "",
    };
  }
}

async function writeAccount(next) {
  await fsp.mkdir(path.dirname(getAccountPath()), { recursive: true });
  await fsp.writeFile(getAccountPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

let mainWindow = null;
let loginInProgress = false;
let runningMcProcess = null;

function isPidAlive(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    // Windows 也支援 signal=0 作為「只檢查是否存在」的探測
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

function cleanupStaleMcProcessIfNeeded() {
  if (!runningMcProcess) return false;
  try {
    // 1) ChildProcess 已經結束：exitCode 會是 number
    if (runningMcProcess.exitCode !== null) {
      runningMcProcess = null;
      sendMcRunning(false);
      return true;
    }

    // 2) 沒有 pid 或 pid 不存在：視為殘留狀態，直接清掉
    const pid = runningMcProcess.pid;
    if (!pid || !isPidAlive(pid)) {
      runningMcProcess = null;
      sendMcRunning(false);
      return true;
    }
  } catch {
    runningMcProcess = null;
    try {
      sendMcRunning(false);
    } catch {}
    return true;
  }
  return false;
}

function requireUpToDateInstanceOrThrow(settings) {
  // 啟動前先確定實例已安裝且是最新（或至少存在）
  // 注意：這裡保持原行為（彈窗 + throw），避免 renderer 無反應
  return checkInstanceStatus(settings).then((status) => {
    if (!status.needsInstall && !status.needsUpdate) return status;
    dialog.showMessageBox({
      type: "info",
      title: "需要安裝/更新",
      message:
        "偵測到尚未安裝或有更新，請先點擊『安裝/更新』完成同步後再啟動。",
    });
    throw new Error("需要安裝/更新。");
  });
}

async function ensureRuntimeAndLaunch({ settings, paths, playerId }) {
  await ensureMinecraftAndFabricRuntime({
    gameDir: paths.gameDir,
    mcVersion: settings.minecraftVersion,
    loaderVersion: fabricLoaderVersion,
    jdkDir: paths.jdkDir,
  });

  await launchMinecraftFabric1211({
    gameDir: paths.gameDir,
    memoryGb: settings.memoryGb,
    playerId,
    minecraftVersion: settings.minecraftVersion,
    jdkDir: paths.jdkDir,
  });
}
const appIconPath = (() => {
  // 先用產生後的 .ico（更適合 Windows 小尺寸顯示），不存在再 fallback 到 png
  const ico = path.join(__dirname, "assets", "icon.ico");
  const png = path.join(__dirname, "assets", "icon.png");
  try {
    require("fs").accessSync(ico);
    return ico;
  } catch {
    return png;
  }
})();

function makeLoginError(code, detail = "") {
  // Renderer 會用這個格式做中文對照
  const safeDetail = String(detail || "").slice(0, 800);
  const e = new Error(`LOGIN_ERR|${code}|${safeDetail}`);
  e.name = "LoginError";
  return e;
}

function createWindow() {
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
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      // 需要讓 preload 使用 Node（path/fs 等）以提供安全的 bridge API
      sandbox: false,
    },
  });

  // Debug 用：把 renderer 的 console/error 印到主程序
  // 平常不掛，避免噪音與 deprecated 警告
  if (debugLoggingEnabled) {
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

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());
}

app.whenReady().then(async () => {
  try {
    // 與 electron-builder 的 build.appId 對齊，避免工作列/通知識別不一致
    app.setAppUserModelId("ggl3.launcher");
  } catch {}

  await ensureSettingsFileInitialized();

  // 初始化 debug log 開關（避免預設就寫檔）
  const initialSettings = await readSettings();
  debugLoggingEnabled = computeDebugLoggingEnabled(initialSettings);
  await rotateLauncherLogIfTooLarge();
  await appendLauncherLog(`BOOT exe=${process.execPath}`);

  createWindow();
  setupIpc();
  startServerStatusPolling();
  // 啟動時：只做「版本檢查」，不自動下載
  setTimeout(() => {
    checkInstanceStatusAndNotify().catch((e) => {
      sendSyncStatus(`版本檢查失敗：${String(e?.message ?? e)}`);
      sendInstanceStatus({
        state: "error",
        needsInstall: true,
        needsUpdate: false,
        text: "版本檢查失敗（可稍後按安裝/更新重試）",
      });
    });
  }, 350);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function setupIpc() {
  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:close", () => mainWindow?.close());
  ipcMain.handle("openExternal", (_e, url) => shell.openExternal(url));

  ipcMain.handle("settings:get", async () => readSettings());
  ipcMain.handle("settings:set", async (_e, patch) => writeSettings(patch));
  ipcMain.handle("dialog:selectDirectory", async (_e, defaultPath) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "選擇安裝位置",
      defaultPath:
        typeof defaultPath === "string" && defaultPath ? defaultPath : "C:\\",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled) return "";
    return result.filePaths?.[0] || "";
  });

  // 通知：先做本地「最近通知」清單（之後可接你的伺服器推播/公告）
  ipcMain.handle("notifications:get", async () => {
    const list = await readNotifications();
    // 只回傳需要顯示的欄位，並且限制最多 20 筆
    return list.slice(0, 20).map((n) => ({
      title: String(n.title || ""),
      body: String(n.body || ""),
      timeText: String(n.timeText || ""),
    }));
  });

  ipcMain.handle("notifications:clear", async () => {
    await writeNotifications([]);
    return true;
  });

  ipcMain.handle("minecraft:launch", async () => {
    // 離線模式：允許未登入也能啟動（等待 AppID 審核期間）
    const acct = await readAccount();
    const settings = await readSettings();
    const paths = getPaths(settings);
    await requireUpToDateInstanceOrThrow(settings);
    await ensureRuntimeAndLaunch({
      settings,
      paths,
      playerId: acct.loggedIn && acct.name ? acct.name : settings.playerId,
    });
  });

  // 離線啟動：不要求登入，直接用 settings.playerId
  ipcMain.handle("minecraft:launchOffline", async () => {
    const settings = await readSettings();
    const paths = getPaths(settings);
    await requireUpToDateInstanceOrThrow(settings);
    await ensureRuntimeAndLaunch({
      settings,
      paths,
      playerId: settings.playerId,
    });
  });

  // Renderer watchdog：避免因事件漏接導致 UI 永久鎖住
  ipcMain.handle("minecraft:isRunning", async () => {
    try {
      if (!runningMcProcess) return false;
      // 若 pid 已不存在，順便清掉狀態並推送解鎖事件
      cleanupStaleMcProcessIfNeeded();
      if (!runningMcProcess) return false;
      return runningMcProcess.exitCode === null;
    } catch {
      return false;
    }
  });

  // 讓 Renderer 可以手動觸發安裝/更新（下載同步 + Java 依賴檢查）
  ipcMain.handle("instance:installOrUpdate", async () => {
    try {
      if (!isManifestUrlConfigured()) {
        // 沒有更新來源：不要丟錯誤、不要觸發 404，直接回饋 UI
        sendSyncStatus("尚未設定更新來源");
        return false;
      }
      const settings = await readSettings();
      await installOrUpdateInstance(settings);
      await checkInstanceStatusAndNotify();
      return true;
    } catch (e) {
      // 把錯誤也回饋到 UI，避免「看起來沒反應」
      const msg = String(e?.message ?? e);
      // 這種錯誤不用很長，避免 UI 被撐壞
      sendSyncStatus(
        msg.includes("尚未設定更新來源")
          ? "尚未設定更新來源"
          : `安裝/更新失敗：${msg}`,
      );
      throw e;
    }
  });

  ipcMain.handle("instance:recheck", async () => {
    await checkInstanceStatusAndNotify();
  });

  // 帳號登入 / 取得狀態 / 登出
  ipcMain.handle("account:get", async () => {
    const acct = await readAccount();
    // 不把 token 丟回 renderer
    const { mcAccessToken, ...safe } = acct;
    return safe;
  });

  ipcMain.handle("account:logout", async () => {
    await writeAccount({
      loggedIn: false,
      name: "",
      uuid: "",
      avatarUrl: "",
      mcAccessToken: "",
    });
    return true;
  });

  ipcMain.handle("account:login", async () => {
    if (loginInProgress) return await ipcMain.invoke("account:get");
    if (!msClientId || msClientId.includes("PUT_YOUR")) {
      dialog.showMessageBox({
        type: "warning",
        title: "需要設定 Microsoft client id",
        message:
          "要做正版登入，需要先在 Azure 建立應用程式並填入 client_id。\n\n" +
          "請到 main.js 的 msClientId 填入你的 Azure Client ID，然後重啟啟動器。",
      });
      throw new Error("尚未設定 msClientId。");
    }

    loginInProgress = true;
    try {
      sendSyncStatus("正在登入 Microsoft…");
      const result = await loginMicrosoftAndMinecraft();

      // 头像：用第三方 head/skin 服務最簡單（僅用於顯示）
      const avatarUrl = result.uuid
        ? `https://crafatar.com/avatars/${result.uuid}?size=64&overlay`
        : "";

      await writeAccount({
        loggedIn: true,
        name: result.name,
        uuid: result.uuid,
        avatarUrl,
        mcAccessToken: result.mcAccessToken,
      });

      const safe = {
        loggedIn: true,
        name: result.name,
        uuid: result.uuid,
        avatarUrl,
      };
      return safe;
    } finally {
      loginInProgress = false;
    }
  });
}

// =========================
// (C) 自動建構 Minecraft + Fabric（當 instance.zip 未包含 versions/）
// =========================

function platformKey() {
  // Mojang 的 rules 使用 os.name: "windows"
  return "windows";
}

function isLibraryAllowedOnWindows(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return true;
  // Mojang 規則：預設是 disallow；最後一條命中的規則決定 allow/disallow
  let allowed = false;
  for (const r of rules) {
    const action = String(r?.action || "").toLowerCase();
    const osName = r?.os?.name ? String(r.os.name).toLowerCase() : "";
    if (osName && osName !== platformKey()) continue;
    if (action === "allow") allowed = true;
    if (action === "disallow") allowed = false;
  }
  return allowed;
}

async function ensureMinecraftAndFabricRuntime({
  gameDir,
  mcVersion,
  loaderVersion,
  jdkDir,
}) {
  // 需求：即使 zip 內已經有部分 versions/，也要確保「原版版本」存在，
  // 否則 Fabric 的 inheritsFrom 會指到不存在的版本 json，導致拿不到 assetIndex.url，
  // 進而造成語言清單只剩 en_us / assets 不完整。

  sendMcStatus("正在檢查 Minecraft 版本檔…");
  await ensureVanillaMinecraftInstalled({ gameDir, mcVersion });

  // 若沒有 fabric-loader 版本資料夾，就安裝 Fabric
  const existingLaunchId = await detectLaunchVersionId(gameDir, mcVersion);
  const hasFabric = Boolean(
    existingLaunchId &&
    String(existingLaunchId).toLowerCase().includes("fabric-loader"),
  );
  if (!hasFabric) {
    sendMcStatus("正在安裝 Fabric Loader…");
    await installFabricWithInstaller({
      gameDir,
      mcVersion,
      loaderVersion,
      jdkDir,
    });
  }

  const launchId = await detectLaunchVersionId(gameDir, mcVersion);
  sendMcStatus("正在準備 libraries / assets…");
  await ensureLibrariesAndAssets({
    gameDir,
    launchVersionId: launchId,
    assetsMode: "all",
  });
}

async function ensureVanillaMinecraftInstalled({ gameDir, mcVersion }) {
  const settings = await readSettings();
  const chosen = await getMcMirrorDecision(settings);

  const manifestUrl = chosen.base
    ? mcUrlFor({ mirrorBase: chosen.base, kind: "manifestV2", value: "" })
    : "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
  const manifest = await fetchJson(manifestUrl);
  const versions = Array.isArray(manifest?.versions) ? manifest.versions : [];
  const v = versions.find((x) => String(x?.id) === String(mcVersion));
  if (!v?.url) throw new Error(`找不到 Minecraft 版本：${mcVersion}`);

  const versionJsonUrl = chosen.base
    ? mcUrlFor({
        mirrorBase: chosen.base,
        kind: "versionJson",
        value: mcVersion,
      })
    : String(v.url);
  const versionJson = await fetchJson(versionJsonUrl);
  const id = String(versionJson?.id || mcVersion);

  const verDir = path.join(gameDir, "versions", id);
  await fsp.mkdir(verDir, { recursive: true });

  const jsonPath = path.join(verDir, `${id}.json`);
  await fsp.writeFile(jsonPath, JSON.stringify(versionJson, null, 2), "utf8");

  // client.jar
  const client = versionJson?.downloads?.client;
  const clientUrl = chosen.base
    ? mcUrlFor({ mirrorBase: chosen.base, kind: "clientJar", value: mcVersion })
    : client?.url;
  if (clientUrl) {
    const jarPath = path.join(verDir, `${id}.jar`);
    const sha1 = String(client?.sha1 || "");
    const totalBytes = Number(client?.size || 0);

    // client.jar 下載階段也顯示：百分比 / 速度 / ETA
    try {
      await fsp.access(jarPath, fs.constants.F_OK);
      await verifyFileSha1IfProvided(jarPath, sha1);
      return;
    } catch {
      try {
        await fsp.rm(jarPath, { force: true });
      } catch {}
    }

    sendMcStatus(`正在下載 Minecraft 客戶端（${chosen.name}）…`);
    let lastAt = Date.now();
    let lastBytes = 0;
    let emaSpeedBps = 0;
    let lastPct = -1;

    await downloadToFile(
      String(clientUrl),
      jarPath,
      ({ received, total }) => {
        const knownTotal = totalBytes > 0 ? totalBytes : Number(total || 0);
        const p =
          knownTotal > 0 ? Math.max(0, Math.min(1, received / knownTotal)) : 0;

        const now = Date.now();
        const dtMs = Math.max(1, now - lastAt);
        const dBytes = Math.max(0, received - lastBytes);
        const instBps = (dBytes * 1000) / dtMs;
        emaSpeedBps =
          emaSpeedBps > 0 ? emaSpeedBps * 0.85 + instBps * 0.15 : instBps;
        lastAt = now;
        lastBytes = received;

        const remainBytes =
          knownTotal > 0 ? Math.max(0, knownTotal - received) : 0;
        const etaSec =
          emaSpeedBps > 1 && remainBytes > 0 ? remainBytes / emaSpeedBps : 0;
        const speedMb = emaSpeedBps / (1024 * 1024);

        const pctInt = Math.round(p * 100);
        if (pctInt === lastPct) return; // 節流：每 1% 更新一次
        lastPct = pctInt;

        const mb = received / (1024 * 1024);
        const totalMb = knownTotal > 0 ? knownTotal / (1024 * 1024) : 0;
        const sizeStr =
          knownTotal > 0
            ? `${mb.toFixed(0)}/${totalMb.toFixed(0)}MB`
            : `${mb.toFixed(0)}MB/?`;
        const speedStr = `${speedMb.toFixed(2)}MB/s`;
        const etaStr = `ETA ${formatEtaSeconds(etaSec)}`;
        sendMcProgress(
          `Minecraft Client ${pctInt}% · ${sizeStr} · ${speedStr} · ${etaStr}`,
          p,
        );
      },
      { resume: true, label: "Minecraft 客戶端" },
    );
    await verifyFileSha1IfProvided(jarPath, sha1);
  }
}

async function installFabricWithInstaller({
  gameDir,
  mcVersion,
  loaderVersion,
  jdkDir,
}) {
  const javaExe = path.join(jdkDir, "bin", "java.exe");
  try {
    await fsp.access(javaExe, fs.constants.F_OK);
  } catch {
    throw new Error(
      "找不到內建 Java，無法安裝 Fabric。請先按『安裝/更新』安裝 Java。",
    );
  }

  // 取得最新 installer 版本
  const installers = await fetchJson(
    "https://meta.fabricmc.net/v2/versions/installer",
  );
  const latest =
    Array.isArray(installers) && installers[0] ? installers[0] : null;
  const installerVersion = String(latest?.version || "1.0.1");
  const installerUrl = `https://maven.fabricmc.net/net/fabricmc/fabric-installer/${installerVersion}/fabric-installer-${installerVersion}.jar`;

  const installerPath = path.join(
    gameDir,
    ".launcher",
    `fabric-installer-${installerVersion}.jar`,
  );
  await fsp.mkdir(path.dirname(installerPath), { recursive: true });
  await downloadIfMissing(installerUrl, installerPath, {
    sha1: "",
    resume: true,
  });

  const args = [
    "-jar",
    installerPath,
    "client",
    "-dir",
    gameDir,
    "-mcversion",
    String(mcVersion),
    "-loader",
    String(loaderVersion),
    "-noprofile",
  ];

  await new Promise((resolve, reject) => {
    const p = spawn(javaExe, args, { cwd: gameDir, windowsHide: true });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `Fabric installer 失敗（code=${code}）${stderr ? `\n${stderr.slice(0, 1200)}` : ""}`,
          ),
        );
    });
    p.on("error", reject);
  });
}

function formatEtaSeconds(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m${String(r).padStart(2, "0")}s`;
}

async function ensureLibrariesAndAssets({
  gameDir,
  launchVersionId,
  assetsMode = "all",
}) {
  if (!launchVersionId) throw new Error("缺少 launchVersionId。");

  const resolved = await resolveVersionChain({
    gameDir,
    versionId: launchVersionId,
  });
  const libs = Array.isArray(resolved.libraries) ? resolved.libraries : [];
  const settings = await readSettings();
  const mirror = await getMcMirrorDecision(settings);

  // 下載 libraries（artifact + windows natives）
  const libTasks = [];
  for (const lib of libs) {
    if (!isLibraryAllowedOnWindows(lib?.rules)) continue;
    const art = lib?.downloads?.artifact;
    if (art?.path && art?.url) {
      libTasks.push({
        kind: "artifact",
        url: rewriteLibraryUrlToMirror(String(art.url), mirror.base),
        sha1: String(art.sha1 || ""),
        size: Number(art.size || 0),
        abs: path.join(gameDir, "libraries", String(art.path)),
      });
    }
    const classifiers = lib?.downloads?.classifiers;
    if (classifiers && typeof classifiers === "object") {
      const native =
        classifiers["natives-windows"] ||
        classifiers["natives-windows-x86_64"] ||
        classifiers["natives-windows-x64"];
      if (native?.path && native?.url) {
        libTasks.push({
          kind: "native",
          url: rewriteLibraryUrlToMirror(String(native.url), mirror.base),
          sha1: String(native.sha1 || ""),
          size: Number(native.size || 0),
          abs: path.join(gameDir, "libraries", String(native.path)),
        });
      }
    }
  }

  if (libTasks.length) {
    const label = "正在下載 libraries…";
    const totalBytes = libTasks.reduce((s, t) => s + (Number(t.size) || 0), 0);
    let doneBytes = 0;
    const inFlight = new Map(); // abs -> received bytes
    let lastUiMs = 0;
    let lastUiBytes = 0;
    let lastUiAt = Date.now();

    const bump = () => {
      const now = Date.now();
      if (now - lastUiMs < 180) return;
      lastUiMs = now;
      let inflight = 0;
      for (const v of inFlight.values()) inflight += Number(v || 0);
      const cur = doneBytes + inflight;
      const p = totalBytes > 0 ? Math.max(0, Math.min(1, cur / totalBytes)) : 0;
      const dt = Math.max(1, now - lastUiAt);
      const dBytes = Math.max(0, cur - lastUiBytes);
      const bps = (dBytes * 1000) / dt;
      lastUiAt = now;
      lastUiBytes = cur;
      const mbps = bps / (1024 * 1024);
      const eta = bps > 0 && totalBytes > 0 ? (totalBytes - cur) / bps : 0;
      sendMcProgress(
        `${label} ${(p * 100).toFixed(0)}% ${mbps.toFixed(1)}MB/s ETA ${formatEtaSeconds(eta)}`,
        p,
      );
    };

    sendMcProgress(label, 0);
    await runPool(libTasks, 6, async (t) => {
      // 若已存在就只累計 bytes（不做全量驗證，避免太慢）
      try {
        await fsp.access(t.abs, fs.constants.F_OK);
        doneBytes += Number(t.size || 0);
        bump();
        return;
      } catch {}

      inFlight.set(t.abs, 0);
      try {
        await downloadToFile(
          String(t.url),
          t.abs,
          ({ received }) => {
            inFlight.set(t.abs, Number(received || 0));
            bump();
          },
          { resume: true, label: "libraries/natives" },
        );
        await verifyFileSha1IfProvided(t.abs, t.sha1);
      } finally {
        inFlight.delete(t.abs);
        doneBytes += Number(t.size || 0);
        bump();
      }

      const downloaded = true;
      if (t.kind === "native" && downloaded) {
        // 解壓 natives 到 gameDir/natives
        const nativesDir = path.join(gameDir, "natives");
        await fsp.mkdir(nativesDir, { recursive: true });
        try {
          const extractZip = require("extract-zip");
          await extractZip(t.abs, { dir: nativesDir });
        } catch {}
      }
    });
  }

  // assets：如果 resolved 有 assetIndex，就下載 index + objects
  const assetIndexId = String(resolved.assetIndex || "").trim();
  if (!assetIndexId) {
    return;
  }

  // Fabric 版本通常在 child json 沒有 assetIndex.url，實際在 inheritsFrom 的原版 json
  const assetIndexInfo = await findAssetIndexUrlFromChain(gameDir, resolved.id);
  const assetIndexUrl =
    typeof assetIndexInfo === "string" ? assetIndexInfo : assetIndexInfo?.url;
  const assetIndexSha1 =
    typeof assetIndexInfo === "object"
      ? String(assetIndexInfo?.sha1 || "")
      : "";
  if (!assetIndexUrl) {
    return;
  }

  const idxPath = path.join(
    gameDir,
    "assets",
    "indexes",
    `${assetIndexId}.json`,
  );
  await fsp.mkdir(path.dirname(idxPath), { recursive: true });
  // index 也做 sha1 校驗（若有）
  // 優先走鏡像的 indexes 路徑；失敗再走官方 url
  const mirrorIdxUrl = mirror.base
    ? `${stripTrailingSlashes(mirror.base)}/assets/indexes/${assetIndexId}.json`
    : "";
  const idxDownloadUrl = mirrorIdxUrl || String(assetIndexUrl);
  try {
    await ensureFileValid(idxDownloadUrl, idxPath, {
      sha1: assetIndexSha1,
      resume: true,
    });
  } catch {
    // fallback to official
    await ensureFileValid(String(assetIndexUrl), idxPath, {
      sha1: assetIndexSha1,
      resume: true,
    });
  }

  const idx = await readJsonFile(idxPath);

  const objects =
    idx?.objects && typeof idx.objects === "object" ? idx.objects : {};
  const base = mirror.base
    ? `${stripTrailingSlashes(mirror.base)}/assets`
    : "https://resources.download.minecraft.net";
  const keys = Object.keys(objects);
  let done = 0;
  const shouldDownload = (k) => {
    if (assetsMode === "all") return true;
    // langOnly
    return (
      String(k).startsWith("minecraft/lang/") && String(k).endsWith(".json")
    );
  };

  const filteredKeys = keys.filter(shouldDownload);
  if (filteredKeys.length === 0) {
    return;
  }

  const label =
    assetsMode === "all" ? "正在下載完整資源…" : "正在下載語言資源…";
  const totalBytes = filteredKeys.reduce(
    (s, k) => s + Number(objects[k]?.size || 0),
    0,
  );
  let doneBytes = 0;
  const inFlight = new Map(); // hash -> received
  let lastUiMs = 0;
  let lastUiBytes = 0;
  let lastUiAt = Date.now();

  const bump = () => {
    const now = Date.now();
    if (now - lastUiMs < 180) return;
    lastUiMs = now;
    let inflight = 0;
    for (const v of inFlight.values()) inflight += Number(v || 0);
    const cur = doneBytes + inflight;
    const p = totalBytes > 0 ? Math.max(0, Math.min(1, cur / totalBytes)) : 0;
    const dt = Math.max(1, now - lastUiAt);
    const dBytes = Math.max(0, cur - lastUiBytes);
    const bps = (dBytes * 1000) / dt;
    lastUiAt = now;
    lastUiBytes = cur;
    const mbps = bps / (1024 * 1024);
    const eta = bps > 0 && totalBytes > 0 ? (totalBytes - cur) / bps : 0;
    sendMcProgress(
      `${label} ${(p * 100).toFixed(0)}% ${mbps.toFixed(1)}MB/s ETA ${formatEtaSeconds(eta)}`,
      p,
    );
  };

  sendMcProgress(label, 0);
  await runPool(filteredKeys, 6, async (k) => {
    const h = objects[k]?.hash;
    if (!h || typeof h !== "string") return;
    const sub = h.slice(0, 2);
    const url = `${base}/${sub}/${h}`;
    const out = path.join(gameDir, "assets", "objects", sub, h);
    const sz = Number(objects[k]?.size || 0);
    try {
      await fsp.access(out, fs.constants.F_OK);
      doneBytes += sz;
      bump();
      return;
    } catch {}

    inFlight.set(h, 0);
    try {
      await downloadToFile(
        url,
        out,
        ({ received }) => {
          inFlight.set(h, Number(received || 0));
          bump();
        },
        { resume: true, label: "assets" },
      );
      await verifyFileSha1IfProvided(out, String(h));
    } finally {
      inFlight.delete(h);
      doneBytes += sz;
      bump();
    }
  });
}

async function findAssetIndexUrlFromChain(gameDir, versionId) {
  // 由 versionId 開始往 inheritsFrom 找，回傳第一個 assetIndex.url (+ sha1 若有)
  const visited = new Set();
  let cur = String(versionId || "").trim();
  while (cur) {
    if (visited.has(cur)) break;
    visited.add(cur);
    const jsonPath = path.join(gameDir, "versions", cur, `${cur}.json`);
    let data;
    try {
      data = await readJsonFile(jsonPath);
    } catch {
      break;
    }
    const url = data?.assetIndex?.url;
    const sha1 = data?.assetIndex?.sha1;
    if (url && typeof url === "string") {
      return { url: String(url), sha1: typeof sha1 === "string" ? sha1 : "" };
    }
    const parent = data?.inheritsFrom;
    if (!parent || typeof parent !== "string") break;
    cur = String(parent).trim();
  }
  return "";
}

// =========================
// (LOGIN) Microsoft → Xbox → Minecraft
// =========================
function base64Url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function startLoopbackServerFixedPort() {
  return await new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on("error", reject);
    // Azure Web Redirect URI 允許 http://localhost，不允許 127.0.0.1
    // 因此這裡也綁定到 localhost
    server.listen(loopbackPort, "localhost", () => {
      resolve({ server, port: loopbackPort });
    });
  });
}

async function exchangeMicrosoftCodeForToken({
  code,
  redirectUri,
  codeVerifier,
}) {
  const body = new URLSearchParams({
    client_id: msClientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  // 對應 login.live.com authorize 使用的 token 端點
  const res = await fetch("https://login.live.com/oauth20_token.srf", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Microsoft token 交換失敗：HTTP ${res.status}`);
  return await res.json();
}

async function xblAuthenticate(msAccessToken) {
  const res = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `d=${msAccessToken}`,
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    }),
  });
  const data = await safeJson(res);
  if (!res.ok)
    throw new Error(
      `XBL Authenticate 失敗：HTTP ${res.status}${data?.message ? ` (${data.message})` : ""}`,
    );
  return data;
}

async function xstsAuthorize(xblToken) {
  const res = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Properties: {
        SandboxId: "RETAIL",
        UserTokens: [xblToken],
      },
      RelyingParty: "rp://api.minecraftservices.com/",
      TokenType: "JWT",
    }),
  });
  const data = await safeJson(res);
  if (!res.ok) {
    // 常見：2148916233/2148916235 等（未成年、地區、未有 Xbox 帳號等）
    const xErr = data?.XErr ? ` XErr=${data.XErr}` : "";
    // 這裡保留 XErr 讓 renderer 轉成友善提示
    throw makeLoginError("XSTS_FAILED", `HTTP ${res.status}${xErr}`);
  }
  return data;
}

async function minecraftLoginWithXbox(xstsToken, userHash) {
  const res = await fetch(
    "https://api.minecraftservices.com/authentication/login_with_xbox",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
      }),
    },
  );
  const data = await safeJson(res);
  if (!res.ok) {
    // 403 很常見：帳號沒有 Minecraft 授權 / 帳號狀態限制
    const msg =
      data?.errorMessage ||
      data?.message ||
      (typeof data === "string" ? data : "") ||
      "";
    if (res.status === 403 && /invalid app registration/i.test(msg)) {
      throw makeLoginError("APPID_NOT_APPROVED", msg);
    }
    throw makeLoginError(
      "MC_LOGIN_FAILED",
      `HTTP ${res.status}${msg ? ` (${msg})` : ""}`,
    );
  }
  return data;
}

async function minecraftGetProfile(mcAccessToken) {
  const res = await fetch(
    "https://api.minecraftservices.com/minecraft/profile",
    {
      headers: { Authorization: `Bearer ${mcAccessToken}` },
    },
  );
  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.errorMessage || data?.message || "";
    throw makeLoginError(
      "MC_PROFILE_FAILED",
      `HTTP ${res.status}${msg ? ` (${msg})` : ""}`,
    );
  }
  return data;
}

async function minecraftCheckEntitlements(mcAccessToken) {
  const res = await fetch(
    "https://api.minecraftservices.com/entitlements/mcstore",
    {
      headers: { Authorization: `Bearer ${mcAccessToken}` },
    },
  );
  const data = await safeJson(res);
  if (!res.ok) return { ok: false, data };

  // 只要 items 有內容，通常代表有購買/授權（Java/Bedrock 的 SKU 會在裡面）
  const items = Array.isArray(data?.items) ? data.items : [];
  return { ok: items.length > 0, data };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    try {
      const t = await res.text();
      return t;
    } catch {
      return null;
    }
  }
}

async function loginMicrosoftAndMinecraft() {
  // PKCE
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const codeChallenge = base64Url(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );

  const { server } = await startLoopbackServerFixedPort();
  const redirectUri = `http://localhost:${loopbackPort}/callback`;

  // Minecraft / XboxLive 登入流程最穩定的做法是使用 MSA 的 authorize 端點（login.live.com）
  // 注意：畫面看起來是 Microsoft 登入是正常的；成功後才會取得 Minecraft Profile。
  const authUrl = new URL("https://login.live.com/oauth20_authorize.srf");
  authUrl.search = new URLSearchParams({
    client_id: msClientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "XboxLive.signin offline_access",
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    prompt: "select_account",
  }).toString();

  const loginWin = new BrowserWindow({
    width: 520,
    height: 740,
    resizable: false,
    modal: true,
    parent: mainWindow,
    autoHideMenuBar: true, // 隱藏上方工具列（File/Edit/...）
    icon: appIconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 保險：強制不顯示 menu bar
  try {
    loginWin.setMenuBarVisibility(false);
  } catch {}

  // 由 loopback server 接 callback，這樣 Azure 設定最穩定
  const authCodePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        try {
          server.close();
        } catch {}
        try {
          loginWin.close();
        } catch {}
        reject(makeLoginError("TIMEOUT", "登入逾時"));
      },
      5 * 60 * 1000,
    );

    const onRequest = (req, res) => {
      try {
        const u = new URL(req.url, redirectUri);
        if (u.pathname !== "/callback") {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }

        const err = u.searchParams.get("error");
        const errDesc = u.searchParams.get("error_description");
        const c = u.searchParams.get("code");

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          `<html><body style="font-family:Segoe UI, sans-serif;"><h3>登入完成</h3><p>你可以關閉此視窗回到啟動器。</p></body></html>`,
        );

        clearTimeout(timeout);
        server.off("request", onRequest);
        try {
          server.close();
        } catch {}
        try {
          loginWin.close();
        } catch {}

        if (err) {
          reject(new Error(`${err}: ${errDesc || ""}`.trim()));
          return;
        }
        if (!c) {
          reject(new Error("登入失敗：沒有取得授權碼（code）。"));
          return;
        }
        resolve(c);
      } catch (e) {
        clearTimeout(timeout);
        server.off("request", onRequest);
        try {
          server.close();
        } catch {}
        reject(e);
      }
    };

    server.on("request", onRequest);
  });

  loginWin.webContents.on(
    "did-fail-load",
    (_e, errorCode, errorDesc, validatedURL) => {
      dialog.showMessageBox({
        type: "error",
        title: "登入頁載入失敗",
        message: `無法載入登入頁。\n\n錯誤：${errorDesc} (${errorCode})\nURL：${validatedURL}`,
      });
    },
  );

  // 使用者手動關閉登入窗
  const userClosedPromise = new Promise((_, reject) => {
    loginWin.on("closed", () => {
      try {
        server.close();
      } catch {}
      reject(makeLoginError("USER_CLOSED", "使用者關閉登入視窗"));
    });
  });

  await loginWin.loadURL(authUrl.toString());
  loginWin.show();

  const authCode = await Promise.race([authCodePromise, userClosedPromise]);

  sendSyncStatus("正在交換 Token…");
  let msToken;
  try {
    msToken = await exchangeMicrosoftCodeForToken({
      code: authCode,
      redirectUri,
      codeVerifier,
    });
  } catch (e) {
    throw makeLoginError("MS_TOKEN_EXCHANGE_FAILED", e?.message || String(e));
  }
  const msAccessToken = msToken.access_token;
  if (!msAccessToken)
    throw makeLoginError("MS_TOKEN_EMPTY", "Microsoft access_token 為空");

  sendSyncStatus("正在取得 Xbox Token…");
  let xbl;
  try {
    xbl = await xblAuthenticate(msAccessToken);
  } catch (e) {
    throw makeLoginError("XBL_FAILED", e?.message || String(e));
  }
  const xsts = await xstsAuthorize(xbl.Token);
  const userHash = xsts?.DisplayClaims?.xui?.[0]?.uhs;
  if (!userHash) throw makeLoginError("XSTS_NO_UHS", "XSTS uhs 缺失");

  sendSyncStatus("正在登入 Minecraft…");
  const mc = await minecraftLoginWithXbox(xsts.Token, userHash);
  const mcAccessToken = mc.access_token;
  if (!mcAccessToken)
    throw makeLoginError("MC_TOKEN_EMPTY", "Minecraft access_token 為空");

  // 授權檢查（更接近「沒有正版就不能啟動」的需求）
  sendSyncStatus("正在檢查 Minecraft 授權…");
  const ent = await minecraftCheckEntitlements(mcAccessToken);
  if (!ent.ok) {
    throw makeLoginError("NO_ENTITLEMENTS", "沒有取得 entitlements");
  }

  const profile = await minecraftGetProfile(mcAccessToken);
  return { name: profile.name, uuid: profile.id, mcAccessToken };
}

function sendSyncStatus(text) {
  void appendLauncherLog(`SYNC ${text}`);
  mainWindow?.webContents?.send("sync:status", { text });
}
function sendSyncProgress(text, progress01) {
  const p = Math.max(0, Math.min(1, Number(progress01) || 0));
  logSyncProgressThrottled(text, p);
  mainWindow?.webContents?.send("sync:progress", { text, progress01: p });
}
function sendSyncDone(text) {
  void appendLauncherLog(`SYNC_DONE ${text}`);
  mainWindow?.webContents?.send("sync:done", { text });
}
function sendMcStatus(text) {
  void appendLauncherLog(`MC ${text}`);
  mainWindow?.webContents?.send("minecraft:status", { text });
}
function sendMcProgress(text, progress01) {
  const p = Math.max(0, Math.min(1, Number(progress01) || 0));
  void appendLauncherLog(`MC ${text} ${(p * 100).toFixed(1)}%`);
  mainWindow?.webContents?.send("minecraft:progress", { text, progress01: p });
}
function sendMcRunning(isRunning) {
  mainWindow?.webContents?.send("minecraft:running", {
    isRunning: Boolean(isRunning),
  });
}
function sendInstanceStatus(payload) {
  // 這裡只記摘要，避免 log 過大
  try {
    const summary = {
      state: payload?.state,
      localVersion: payload?.localVersion,
      remoteVersion: payload?.remoteVersion,
      needsInstall: payload?.needsInstall,
      needsUpdate: payload?.needsUpdate,
      noUpdateSource: payload?.noUpdateSource,
    };
    void appendLauncherLog(`INSTANCE ${JSON.stringify(summary)}`);
  } catch {}
  mainWindow?.webContents?.send("instance:status", payload);
}
function sendServerStatus(state) {
  mainWindow?.webContents?.send("server:status", { state });
}

function startServerStatusPolling() {
  // 沒設定就不輪詢
  if (!isServerStatusConfigured()) {
    sendServerStatus("unknown");
    return;
  }

  const intervalMs = 7000;
  const timeoutMs = 3000;

  const tick = async () => {
    // 1) 若有 HTTP health URL，優先用它
    if (String(serverStatusUrl || "").trim()) {
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), timeoutMs);
        const res = await fetch(serverStatusUrl, {
          cache: "no-store",
          signal: ac.signal,
        });
        clearTimeout(t);
        sendServerStatus(res.ok ? "online" : "offline");
        return;
      } catch {
        sendServerStatus("offline");
        return;
      }
    }

    // 2) 否則用 TCP 測試 Minecraft port
    try {
      const ok = await tcpProbe(serverStatusHost, serverStatusPort, timeoutMs);
      sendServerStatus(ok ? "online" : "offline");
    } catch {
      sendServerStatus("offline");
    }
  };

  tick().catch(() => {});
  setInterval(() => tick().catch(() => {}), intervalMs);
}

function tcpProbe(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const net = require("net");
    const socket = new net.Socket();
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {}
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));

    socket.connect(port, host);
  });
}

// =========================
// (A) Manifest 同步邏輯（實例安裝/更新）
// =========================
// manifest.json 建議格式（你可以照這個生成在你的伺服器上）：
// {
//   "hashAlgo": "sha1",
//   "version": "2026.04.14-1",      // ← 伺服器端「實例版本」
//   "mode": "files",               // 'files' | 'zip'（預設 files）
//   "baseUrl": "https://example.com/files/",
//   "files": [
//     { "path": "mods/some-mod.jar", "hash": "<sha1>", "size": 123456, "url": "mods/some-mod.jar" },
//     { "path": "config/some.cfg", "hash": "<sha1>", "url": "config/some.cfg" }
//   ]
// }
//
// 或者（推薦給 GitHub Releases）：用單一 zip 當成實例包：
// {
//   "version": "2026.04.14-1",
//   "mode": "zip",
//   "zipUrl": "https://github.com/<owner>/<repo>/releases/download/<tag>/instance.zip"
// }
//
// 說明：
// - path: 相對於 gameDir 的相對路徑
// - hash: 遠端檔案雜湊（sha1 或 md5）
// - url: 下載路徑（可相對 baseUrl 或絕對 URL）

async function fetchJson(url) {
  return await withRetries(
    async () => {
      const res = await fetchWithNiceError(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`下載 manifest 失敗：HTTP ${res.status}`);
      return await res.json();
    },
    {
      retries: 1,
      baseDelayMs: 650,
      onRetry: (tryNo, maxTry) =>
        notifyRetryToUi(makeRetryNotice("更新資訊", tryNo, maxTry)),
    },
  );
}

function formatFetchCause(err) {
  const parts = [];
  const name = err?.name ? String(err.name) : "";
  const msg = err?.message ? String(err.message) : "";
  if (name || msg) parts.push(`${name || "Error"}${msg ? `: ${msg}` : ""}`);

  // Node fetch 常把底層錯誤塞在 err.cause
  const c = err?.cause;
  if (c) {
    const cName = c?.name ? String(c.name) : "";
    const cCode = c?.code ? String(c.code) : "";
    const cMsg = c?.message ? String(c.message) : "";
    const line = [cName || "Cause", cCode ? `(${cCode})` : "", cMsg]
      .filter(Boolean)
      .join(" ");
    if (line) parts.push(line);
  }

  // 有些環境會把 code 放在 err.code
  if (err?.code) parts.push(`code=${String(err.code)}`);
  return parts.join(" | ");
}

async function fetchWithNiceError(url, options = {}) {
  const ac = new AbortController();
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? options.timeoutMs
    : 15000;

  // 支援外部中止（例如低速偵測要切換鏡像）
  const outerSignal = options.signal;
  const abortOuter = () => {
    try {
      ac.abort();
    } catch {}
  };
  if (outerSignal && typeof outerSignal.addEventListener === "function") {
    if (outerSignal.aborted) abortOuter();
    else outerSignal.addEventListener("abort", abortOuter, { once: true });
  }

  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    // 重要：把 timeout 與更清楚的錯誤回饋包起來
    // 注意：signal 以內部 AbortController 為準（並由 outerSignal 轉發）
    const { signal: _ignored, ...rest } = options || {};
    return await fetch(url, { ...rest, signal: ac.signal });
  } catch (e) {
    const detail = formatFetchCause(e) || "fetch failed";
    throw new Error(`連線失敗：${url}\n${detail}`);
  } finally {
    clearTimeout(t);
    if (outerSignal && typeof outerSignal.removeEventListener === "function") {
      try {
        outerSignal.removeEventListener("abort", abortOuter);
      } catch {}
    }
  }
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableError(err) {
  const msg = String(err?.message ?? err);
  // mirror 低速切換或人工中止不重試
  if (msg.includes("下載中止（切換鏡像）")) return false;
  // 本機環境問題不重試
  if (/ENOSPC|EACCES|EPERM/i.test(msg)) return false;
  // fetchWithNiceError 的通用錯誤
  if (msg.includes("連線失敗：")) return true;
  // 下載 HTTP 錯誤（500/502/503/504/429 這類比較值得重試）
  const m = msg.match(/HTTP\s+(\d+)/i);
  if (m) {
    const code = Number(m[1]);
    if ([408, 425, 429, 500, 502, 503, 504].includes(code)) return true;
    return false;
  }
  return false;
}

function notifyRetryToUi(text) {
  try {
    sendSyncStatus(text);
  } catch {}
  try {
    sendMcStatus(text);
  } catch {}
}

function makeRetryNotice(label, tryNo, maxTry) {
  const head = label ? `${label}：` : "";
  return `${head}網路不穩，正在重試 (${tryNo}/${maxTry})…`;
}

async function withRetries(
  fn,
  { retries = 1, baseDelayMs = 650, onRetry = null } = {},
) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastErr = e;
      if (i >= retries || !isRetryableError(e)) break;
      try {
        if (typeof onRetry === "function") onRetry(i + 1, retries, e);
      } catch {}
      const delay = baseDelayMs * Math.pow(2, i);
      await sleepMs(delay);
    }
  }
  throw lastErr;
}

async function readInstanceMeta() {
  try {
    const settings = await readSettings();
    const p = getPaths(settings).instanceMetaPath;
    const raw = await fsp.readFile(p, "utf8");
    const parsed = JSON.parse(raw);
    return {
      localVersion:
        typeof parsed.localVersion === "string" ? parsed.localVersion : "",
      installedAt:
        typeof parsed.installedAt === "number" ? parsed.installedAt : 0,
      launchVersionId:
        typeof parsed.launchVersionId === "string"
          ? parsed.launchVersionId
          : "",
    };
  } catch {
    return { localVersion: "", installedAt: 0, launchVersionId: "" };
  }
}

async function writeInstanceMeta(patch) {
  const settings = await readSettings();
  const metaPath = getPaths(settings).instanceMetaPath;
  const cur = await readInstanceMeta();
  const next = { ...cur, ...patch };
  await fsp.mkdir(path.dirname(metaPath), { recursive: true });
  await fsp.writeFile(metaPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function hashFile(filePath, algo) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (d) => h.update(d));
    stream.on("end", () => resolve(h.digest("hex")));
  });
}

async function ensureDirForFile(absFilePath) {
  await fsp.mkdir(path.dirname(absFilePath), { recursive: true });
}

async function downloadToFile(url, absPath, onChunk, options = {}) {
  await ensureDirForFile(absPath);
  const resume = Boolean(options?.resume);
  const sig = options?.signal;
  const label = typeof options?.label === "string" ? options.label.trim() : "";

  return await withRetries(
    async (attempt) => {
      // 斷點續傳：用 .part 當暫存檔（完成後 rename 成正式檔）
      const partPath = resume ? absPath + ".part" : absPath + ".tmp";
      let existing = 0;
      if (resume) {
        try {
          const st = await fsp.stat(partPath);
          if (st.isFile()) existing = st.size;
        } catch {}
      }

      const headers = {};
      if (resume && existing > 0) headers["Range"] = `bytes=${existing}-`;

      const res = await fetchWithNiceError(url, {
        cache: "no-store",
        signal: sig,
        headers,
      });
      if (!res.ok) throw new Error(`下載失敗：HTTP ${res.status}`);

      // 若伺服器不支援 Range，可能仍回 200；此時就從頭覆寫
      if (resume && existing > 0 && res.status !== 206) {
        try {
          await fsp.rm(partPath, { force: true });
        } catch {}
        existing = 0;
      }

      const contentLength = Number(res.headers.get("content-length") || "0");
      const contentRange = String(res.headers.get("content-range") || "");
      const m = contentRange.match(/\/(\d+)\s*$/);
      const totalOverall = m ? Number(m[1]) : existing + contentLength;
      let received = existing;

      const body = res.body;
      if (!body) throw new Error("下載失敗：response body 為空");

      // 1) Web ReadableStream 分支
      if (typeof body.getReader === "function") {
        const file = fs.createWriteStream(partPath, {
          flags: resume && existing > 0 ? "a" : "w",
        });
        const reader = body.getReader();

        try {
          while (true) {
            if (sig?.aborted) throw new Error("下載中止（切換鏡像）");
            const { value, done } = await reader.read();
            if (done) break;
            if (!value) continue;

            received += value.byteLength || value.length || 0;
            if (onChunk) onChunk({ received, total: totalOverall });

            await new Promise((resolve, reject) => {
              file.write(Buffer.from(value), (err) =>
                err ? reject(err) : resolve(),
              );
            });
          }
          await new Promise((resolve, reject) =>
            file.end((err) => (err ? reject(err) : resolve())),
          );
          await fsp.rename(partPath, absPath);
          return;
        } catch (e) {
          try {
            file.destroy();
          } catch {}
          try {
            if (!resume) await fsp.rm(partPath, { force: true });
          } catch {}
          throw e;
        }
      }

      // 2) Node Readable 分支
      return await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(partPath, {
          flags: resume && existing > 0 ? "a" : "w",
        });
        const abort = () => {
          try {
            body.destroy(new Error("下載中止（切換鏡像）"));
          } catch {}
          try {
            file.destroy(new Error("下載中止（切換鏡像）"));
          } catch {}
          try {
            if (!resume) fs.rmSync(partPath, { force: true });
          } catch {}
          reject(new Error("下載中止（切換鏡像）"));
        };
        if (sig && typeof sig.addEventListener === "function") {
          if (sig.aborted) return abort();
          sig.addEventListener("abort", abort, { once: true });
        }

        body.on("data", (chunk) => {
          received += chunk.length;
          if (onChunk) onChunk({ received, total: totalOverall });
        });
        body.on("error", reject);
        file.on("error", reject);
        file.on("finish", async () => {
          try {
            await fsp.rename(partPath, absPath);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        body.pipe(file);
      });
    },
    {
      retries: 1,
      baseDelayMs: 650,
      onRetry: (tryNo, maxTry, e) => {
        // tryNo/maxTry 是以 1 為起點的人類可讀次數
        const msg = String(e?.message ?? e);
        notifyRetryToUi(makeRetryNotice(label, tryNo, maxTry));
        void appendLauncherLog(
          `RETRY downloadToFile ${url} (${tryNo}/${maxTry}) ${msg.slice(0, 200)}`,
        );
      },
    },
  );
}

function normalizeDownloadSources(sources) {
  const arr = Array.isArray(sources) ? sources : [];
  const out = [];
  for (const s of arr) {
    if (!s) continue;
    if (typeof s === "string") {
      const url = s.trim();
      if (!url) continue;
      out.push({ name: "mirror", url });
      continue;
    }
    if (typeof s === "object") {
      const url = String(s.url || "").trim();
      if (!url) continue;
      const name = String(s.name || "mirror").trim() || "mirror";
      const sha256 = String(s.sha256 || "").trim();
      out.push({ name, url, sha256 });
    }
  }
  return out;
}

async function downloadToFileWithFallback(
  sources,
  absPath,
  onChunk,
  options = {},
) {
  const list = normalizeDownloadSources(sources);
  if (list.length === 0)
    throw new Error("下載失敗：沒有可用的下載來源（sources 為空）");

  let lastErr = null;
  let lowSpeedAbortCount = 0;
  for (const src of list) {
    try {
      try {
        sendSyncStatus(`正在嘗試鏡像：${src.name}`);
      } catch {}

      // 低速偵測：30 秒下載 < 1MB 就切換鏡像
      const ac = new AbortController();
      const SPEED_WINDOW_MS = 30_000;
      const MIN_BYTES_PER_WINDOW = 1 * 1024 * 1024; // 1MB / 30s
      let windowStartAt = Date.now();
      let windowStartBytes = 0;
      let lastBytes = 0;

      const wrappedOnChunk = (info) => {
        const received = Number(info?.received || 0);
        lastBytes = received;

        const now = Date.now();
        if (now - windowStartAt >= SPEED_WINDOW_MS) {
          const delta = received - windowStartBytes;
          if (delta < MIN_BYTES_PER_WINDOW) {
            try {
              ac.abort();
            } catch {}
            return;
          }
          windowStartAt = now;
          windowStartBytes = received;
        }
        if (onChunk) onChunk(info);
      };

      // 若 30 秒完全沒有任何 chunk 也視為太慢
      const tick = setInterval(() => {
        const now = Date.now();
        if (now - windowStartAt >= SPEED_WINDOW_MS) {
          const delta = lastBytes - windowStartBytes;
          if (delta < MIN_BYTES_PER_WINDOW) {
            try {
              ac.abort();
            } catch {}
          } else {
            windowStartAt = now;
            windowStartBytes = lastBytes;
          }
        }
      }, 1000);

      try {
        // 每個來源都先用同一個輸出檔名；downloadToFile 會寫 .tmp 再 rename
        await downloadToFile(src.url, absPath, wrappedOnChunk, {
          signal: ac.signal,
          resume: Boolean(options?.resume),
        });
      } finally {
        clearInterval(tick);
      }
      return src;
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message ?? e);
      const isAbort = msg.includes("下載中止（切換鏡像）");
      if (isAbort) lowSpeedAbortCount += 1;

      // 換下一個 mirror 前給 UI 一個提示（不影響流程）
      try {
        sendSyncStatus(
          isAbort
            ? `鏡像過慢（${src.name}），切換中…`
            : `鏡像失敗（${src.name}），切換中…`,
        );
      } catch {}
    }
  }

  if (lowSpeedAbortCount >= list.length) {
    const names = list.map((x) => x.name).join(", ");
    throw new Error(
      `所有鏡像下載速度都過慢（30 秒 < 1MB）。\n鏡像：${names}\n你可以稍後再試，或設定 GGL_JAVA_MIRROR_URL 使用較快的鏡像。`,
    );
  }
  throw lastErr || new Error("下載失敗：所有鏡像皆失敗");
}

async function verifyFileSha256IfProvided(absPath, sha256) {
  const expected = String(sha256 || "")
    .trim()
    .toLowerCase();
  if (!expected) return;
  if (!/^[a-f0-9]{64}$/.test(expected)) return;
  const got = String(await hashFile(absPath, "sha256"))
    .trim()
    .toLowerCase();
  if (got !== expected) {
    throw new Error(
      `檔案驗證失敗（sha256 不符）\nexpected=${expected}\ngot=${got}`,
    );
  }
}

async function verifyFileSha1IfProvided(absPath, sha1) {
  const expected = String(sha1 || "")
    .trim()
    .toLowerCase();
  if (!expected) return;
  if (!/^[a-f0-9]{40}$/.test(expected)) return;
  const got = String(await hashFile(absPath, "sha1"))
    .trim()
    .toLowerCase();
  if (got !== expected) {
    throw new Error(
      `檔案驗證失敗（sha1 不符）\nexpected=${expected}\ngot=${got}`,
    );
  }
}

async function downloadIfMissing(
  url,
  absPath,
  { sha1 = "", resume = true, verifyExisting = false } = {},
) {
  try {
    await fsp.access(absPath, fs.constants.F_OK);
    if (verifyExisting) {
      await verifyFileSha1IfProvided(absPath, sha1);
    }
    return false;
  } catch {}
  await downloadToFile(String(url), absPath, null, { resume });
  await verifyFileSha1IfProvided(absPath, sha1);
  return true;
}

async function ensureFileValid(
  url,
  absPath,
  { sha1 = "", resume = true } = {},
) {
  // 若檔案存在但 sha1 不符，就刪掉重抓
  try {
    await fsp.access(absPath, fs.constants.F_OK);
    await verifyFileSha1IfProvided(absPath, sha1);
    return false;
  } catch (e) {
    // 若檔案存在但驗證失敗，先清掉再重抓
    try {
      await fsp.rm(absPath, { force: true });
    } catch {}
  }
  await downloadToFile(String(url), absPath, null, { resume });
  await verifyFileSha1IfProvided(absPath, sha1);
  return true;
}

async function runPool(items, concurrency, worker) {
  const n = Math.max(1, Math.floor(Number(concurrency) || 1));
  let idx = 0;
  const workers = Array.from(
    { length: Math.min(n, items.length) },
    async () => {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        await worker(items[i], i);
      }
    },
  );
  await Promise.all(workers);
}

function stripTrailingSlashes(u) {
  return String(u || "")
    .trim()
    .replace(/\/+$/, "");
}

function buildMcMirrors(settings) {
  const env = String(process.env.GGL_MC_MIRROR_BASE || "").trim();
  const list = [
    env ? { name: "自訂鏡像", base: env } : null,
    { name: "BMCLAPI2", base: "https://bmclapi2.bangbang93.com" },
    { name: "Mojang 官方", base: "" },
  ].filter(Boolean);
  return list.map((m) => ({ ...m, base: stripTrailingSlashes(m.base) }));
}

function mcUrlFor({ mirrorBase, kind, value }) {
  const b = stripTrailingSlashes(mirrorBase);
  const v = String(value || "");
  if (!b) return v;
  if (kind === "manifestV2") return `${b}/mc/game/version_manifest_v2.json`;
  if (kind === "versionJson")
    return `${b}/version/${encodeURIComponent(v)}/json`;
  if (kind === "clientJar")
    return `${b}/version/${encodeURIComponent(v)}/client`;
  if (kind === "assetObject") return `${b}/assets/${v.replace(/^\/+/, "")}`;
  if (kind === "mavenPath") return `${b}/maven/${v.replace(/^\/+/, "")}`;
  return v;
}

function rewriteLibraryUrlToMirror(url, mirrorBase) {
  const b = stripTrailingSlashes(mirrorBase);
  if (!b) return String(url || "");
  const s = String(url || "");
  const m = s.match(/^https?:\/\/libraries\.minecraft\.net\/(.+)$/i);
  if (m) return mcUrlFor({ mirrorBase: b, kind: "mavenPath", value: m[1] });
  return s;
}

async function pickFastestMcMirror(settings) {
  const mirrors = buildMcMirrors(settings);
  const probeSources = mirrors.map((m) => ({
    name: m.name,
    url: m.base
      ? `${m.base}/mc/game/version_manifest_v2.json`
      : "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
    base: m.base,
  }));
  const ranked = await rankSourcesByQuickProbe(
    probeSources.map((x) => ({ name: x.name, url: x.url })),
  );
  const best = ranked[0];
  const bestFull =
    probeSources.find((x) => x.url === best.url) || probeSources[0];
  return { name: bestFull.name, base: bestFull.base };
}

const _mcMirrorCache = {
  picked: null,
  pickedAt: 0,
};

async function getMcMirrorDecision(settings, { ttlMs = 10 * 60 * 1000 } = {}) {
  const now = Date.now();
  if (_mcMirrorCache.picked && now - _mcMirrorCache.pickedAt < ttlMs)
    return _mcMirrorCache.picked;

  const picked = await pickFastestMcMirror(settings);
  _mcMirrorCache.picked = picked;
  _mcMirrorCache.pickedAt = now;
  return picked;
}

async function rankSourcesByQuickProbe(sources) {
  // 小範圍測速：抓前 256KB，量測耗時；失敗的排最後
  const MAX_BYTES = 256 * 1024;
  const TIMEOUT_MS = 4000;

  async function probeOne(src) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    const started = Date.now();
    try {
      const res = await fetchWithNiceError(src.url, {
        cache: "no-store",
        timeoutMs: TIMEOUT_MS,
        signal: ac.signal,
        headers: { Range: `bytes=0-${MAX_BYTES - 1}` },
      });
      if (!res.ok) return { ok: false, ms: 1e9, src };
      const body = res.body;
      if (!body) return { ok: false, ms: 1e9, src };

      let got = 0;
      if (typeof body.getReader === "function") {
        const reader = body.getReader();
        while (got < MAX_BYTES) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          got += value.byteLength || value.length || 0;
          if (got >= MAX_BYTES) break;
        }
      } else {
        await new Promise((resolve, reject) => {
          body.on("data", (chunk) => {
            got += chunk.length;
            if (got >= MAX_BYTES) {
              try {
                body.destroy();
              } catch {}
              resolve();
            }
          });
          body.on("error", reject);
          body.on("end", resolve);
        });
      }
      const ms = Math.max(1, Date.now() - started);
      return { ok: true, ms, src };
    } catch {
      return { ok: false, ms: 1e9, src };
    } finally {
      clearTimeout(t);
      try {
        ac.abort();
      } catch {}
    }
  }

  // 串行測試：避免同時佔用頻寬影響判斷
  const results = [];
  for (const s of sources) results.push(await probeOne(s));
  results.sort((a, b) => (a.ok === b.ok ? a.ms - b.ms : a.ok ? -1 : 1));
  return results.map((r) => r.src);
}

async function getZuluWindowsJre21ZipUrl() {
  // 自動抓最新 Zulu JRE（CA/GA, zip, windows x64）
  // Docs: https://docs.azul.com/core/install/metadata-api
  try {
    const u =
      "https://api.azul.com/metadata/v1/zulu/packages/?" +
      [
        "latest=true",
        "page=1",
        "page_size=1",
        "os=windows",
        "arch=x86_64",
        "java_version=21",
        "java_package_type=jre",
        "archive_type=zip",
        "release_status=ga",
        "availability_types=CA",
        "include_fields=download_url,sha256_hash",
      ].join("&");
    const res = await fetchWithNiceError(u, {
      cache: "no-store",
      timeoutMs: 8000,
      headers: { "User-Agent": "GGL3-Launcher", Accept: "application/json" },
    });
    if (!res.ok) return "";
    const j = await res.json();
    const item = Array.isArray(j) ? j[0] : null;
    const url = String(item?.download_url || "").trim();
    const sha256 = String(item?.sha256_hash || "").trim();
    return url && /^https?:\/\//i.test(url) ? { url, sha256 } : null;
  } catch {
    return null;
  }
}

async function getSemeruWindowsJre21ZipUrl() {
  // GitHub Releases：抓最新 Windows x64 JRE zip
  try {
    const res = await fetchWithNiceError(
      "https://api.github.com/repos/ibmruntimes/semeru21-binaries/releases/latest",
      {
        cache: "no-store",
        timeoutMs: 8000,
        headers: {
          "User-Agent": "GGL3-Launcher",
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (!res.ok) return "";
    const j = await res.json();
    const assets = Array.isArray(j?.assets) ? j.assets : [];
    const zip = assets.find((a) => {
      const name = String(a?.name || "").toLowerCase();
      return (
        name.includes("jre") &&
        name.includes("windows") &&
        (name.includes("x64") || name.includes("amd64")) &&
        name.endsWith(".zip")
      );
    });
    const zipUrl =
      typeof zip?.browser_download_url === "string"
        ? zip.browser_download_url
        : "";
    if (!zipUrl) return null;

    // 嘗試找 sha256 檔案（格式依 release 而異，盡量寬鬆匹配）
    const zipName = String(zip?.name || "");
    const shaAsset = assets.find((a) => {
      const name = String(a?.name || "").toLowerCase();
      if (!name.includes("sha256")) return false;
      if (
        !name.endsWith(".txt") &&
        !name.endsWith(".sha256") &&
        !name.endsWith(".sha256.txt")
      )
        return false;
      // 可能是單一總表，也可能是針對該 zip
      return (
        !zipName ||
        name.includes(zipName.toLowerCase().replace(/[^a-z0-9]+/g, "")) ||
        name.includes("jre")
      );
    });

    let sha256 = "";
    if (shaAsset?.browser_download_url) {
      try {
        const r = await fetchWithNiceError(
          String(shaAsset.browser_download_url),
          { cache: "no-store", timeoutMs: 8000 },
        );
        if (r.ok) {
          const txt = await r.text();
          // 常見格式："<hash>  <filename>"
          const line = txt
            .split(/\r?\n/)
            .map((s) => s.trim())
            .find((s) => s && (!zipName || s.includes(zipName)));
          const m = line ? line.match(/^([a-fA-F0-9]{64})\b/) : null;
          if (m) sha256 = m[1].toLowerCase();
        }
      } catch {}
    }

    return { url: zipUrl, sha256 };
  } catch {
    return null;
  }
}

function resolveFileUrl(manifest, fileEntry) {
  if (fileEntry.url && /^https?:\/\//i.test(fileEntry.url))
    return fileEntry.url;
  const baseUrl = typeof manifest.baseUrl === "string" ? manifest.baseUrl : "";
  const rel = fileEntry.url || fileEntry.path;
  if (!baseUrl)
    throw new Error("manifest 缺少 baseUrl，且 file.url 也不是完整 URL。");
  return baseUrl.replace(/\/+$/, "") + "/" + String(rel).replace(/^\/+/, "");
}

const noticeLogCache = new Map(); // logUrl -> { ts: number, lines: string[] }

async function fetchNoticeLogLines(logUrl) {
  const url = String(logUrl || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return [];

  const cached = noticeLogCache.get(url);
  const now = Date.now();
  if (cached && now - cached.ts < 60_000) return cached.lines;

  try {
    const res = await fetchWithNiceError(url, {
      cache: "no-store",
      timeoutMs: 8000,
    });
    if (!res.ok) return [];
    const ct = String(res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();

    let lines = [];
    if (
      ct.includes("application/json") ||
      text.trim().startsWith("[") ||
      text.trim().startsWith("{")
    ) {
      try {
        const j = JSON.parse(text);
        if (Array.isArray(j)) lines = j.map((x) => String(x));
        else if (Array.isArray(j?.log)) lines = j.log.map((x) => String(x));
        else if (Array.isArray(j?.lines)) lines = j.lines.map((x) => String(x));
      } catch {
        // fallback to plaintext split
      }
    }
    if (lines.length === 0) {
      lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // UI 會用可捲動區塊顯示，這裡保留較多行數
    lines = lines.slice(0, 150);
    noticeLogCache.set(url, { ts: now, lines });
    return lines;
  } catch {
    return [];
  }
}

async function checkInstanceStatus(settings) {
  // 只檢查「是否安裝」以及「版本是否落後」
  const localMeta = await readInstanceMeta();
  const paths = getPaths(settings);
  let hasMinecraftDir = false;
  try {
    await fsp.access(paths.gameDir, fs.constants.F_OK);
    hasMinecraftDir = true;
  } catch {}

  if (!isManifestUrlConfigured()) {
    // 沒有更新來源：不做遠端請求，避免 404 干擾 UI
    const needsInstall = !hasMinecraftDir || !localMeta.localVersion;
    return {
      localVersion: localMeta.localVersion || "",
      remoteVersion: "",
      needsInstall,
      needsUpdate: false,
      noUpdateSource: true,
    };
  }

  const manifest = await fetchJson(remoteManifestUrl);
  const remoteVersion =
    typeof manifest.version === "string" ? manifest.version : "";

  const needsInstall = !hasMinecraftDir || !localMeta.localVersion;
  const needsUpdate =
    !needsInstall && remoteVersion && localMeta.localVersion !== remoteVersion;

  const notice = await normalizeManifestNotice(manifest);
  return {
    localVersion: localMeta.localVersion || "",
    remoteVersion,
    needsInstall,
    needsUpdate,
    noUpdateSource: false,
    notice,
  };
}

async function normalizeManifestNotice(manifest) {
  const n =
    manifest?.notice && typeof manifest.notice === "object"
      ? manifest.notice
      : {};
  const title = typeof n.title === "string" ? n.title.trim() : "";
  const subtitle = typeof n.subtitle === "string" ? n.subtitle.trim() : "";
  const imageUrl = typeof n.imageUrl === "string" ? n.imageUrl.trim() : "";
  const logUrl = typeof n.logUrl === "string" ? n.logUrl.trim() : "";
  const inlineLog = Array.isArray(n.log)
    ? n.log
        .map((x) => String(x))
        .filter(Boolean)
        .slice(0, 150)
    : [];
  const remoteLog =
    inlineLog.length === 0 ? await fetchNoticeLogLines(logUrl) : [];
  const log = inlineLog.length ? inlineLog : remoteLog;

  if (!title && !subtitle && !imageUrl && !logUrl && log.length === 0)
    return null;
  return { title, subtitle, imageUrl, logUrl, log };
}

async function checkInstanceStatusAndNotify() {
  sendSyncStatus("正在檢查版本…");
  sendSyncProgress("正在檢查版本…", 0.05);

  const settings = await readSettings();
  const s = await checkInstanceStatus(settings);
  const lv = s.localVersion ? `本地：${s.localVersion}` : "本地：未安裝";
  const rv = s.remoteVersion ? `遠端：${s.remoteVersion}` : "遠端：未知";

  let text = "";
  if (s.noUpdateSource) {
    // 需求：沒有 manifest URL 時，直接提示「尚未設定更新來源」
    text = s.needsInstall
      ? "尚未設定更新來源（無法安裝）"
      : `尚未設定更新來源（${lv}）`;
    sendSyncDone("尚未設定更新來源");
  } else {
    text = s.needsInstall
      ? `尚未安裝（${rv}）`
      : s.needsUpdate
        ? `有更新可用（${lv} → ${rv}）`
        : `已是最新（${lv}）`;
    sendSyncDone("版本檢查完成");
  }

  sendInstanceStatus({ state: "checked", ...s, text });
}

async function installOrUpdateInstance(settings) {
  if (!isManifestUrlConfigured()) {
    throw new Error(
      "尚未設定更新來源（manifest URL）。請先在 main.js 設定 remoteManifestUrl。",
    );
  }
  const paths = getPaths(settings);
  // 1) 建立啟動器結構
  await fsp.mkdir(paths.groupDir, { recursive: true });
  await fsp.mkdir(paths.jdkDir, { recursive: true });
  await fsp.mkdir(paths.tempDir, { recursive: true });
  await fsp.mkdir(paths.gameDir, { recursive: true });

  // 兼容：把舊的 group\catnip 搬到 group\GGL（避免使用者改名後需要重裝）
  await migrateLegacyInstanceFolderIfNeeded(paths);

  // 2) 需求：不允許使用者自備 Java
  // => 按「安裝/更新」時，若內建 jdk 不存在，就自動下載安裝到 <root>\jdk
  await ensureBundledJava({ settings, paths });

  // 3) 下載 manifest，依 hash 同步到實例 .minecraft（mods/config 等）
  sendSyncStatus("準備安裝/更新…");
  sendSyncProgress("準備安裝/更新…", 0);

  const manifest = await fetchJson(remoteManifestUrl);

  // (GitHub 友善) zip 模式：一個 instance.zip 打包 mods/config/... 解壓到 gameDir
  const mode = String(manifest.mode || "files").toLowerCase();
  if (mode === "zip") {
    const zipUrl = String(manifest.zipUrl || "").trim();
    if (!zipUrl || !/^https?:\/\//i.test(zipUrl)) {
      throw new Error("manifest.mode=zip 但缺少有效的 zipUrl。");
    }

    const zipPath = path.join(paths.tempDir, `${instanceId}-instance.zip`);
    sendSyncStatus("正在下載實例包…");
    await downloadToFile(
      zipUrl,
      zipPath,
      ({ received, total }) => {
        const p = total > 0 ? received / total : 0;
        sendSyncProgress("正在下載實例包…", Math.min(0.8, p * 0.8));
      },
      { resume: true, label: "實例包" },
    );

    sendSyncStatus("正在套用實例包…");
    sendSyncProgress("正在套用實例包…", 0.82);

    const extractZip = require("extract-zip");
    const extractDir = path.join(paths.tempDir, `${instanceId}-extract`);
    await fsp.rm(extractDir, { recursive: true, force: true });
    await fsp.mkdir(extractDir, { recursive: true });
    await extractZip(zipPath, { dir: extractDir });

    // zip 內的結構可能是：
    // - 直接就是 .minecraft 內容（包含 versions/ assets/ libraries/）
    // - 根目錄有一個 .minecraft 資料夾
    // - 多包了一層資料夾（例如 InstanceName/.minecraft/...）
    // 因此這裡自動尋找「真正的 .minecraft 根」。
    // 先嘗試找「完整 .minecraft」（包含 versions/*.json）。
    // 若找不到，也允許只有 mods/config 的輕量包；versions 會在啟動時自動建構。
    let srcRoot = await findMinecraftRoot(extractDir);
    if (!srcRoot) {
      srcRoot = await findMinecraftRootFallback(extractDir);
    }
    if (!srcRoot) {
      throw new Error(
        "實例包內找不到可套用的內容（請確認 instance.zip 不是空的）。",
      );
    }

    // 需求更新：完整套用 instance.zip（包含 versions/assets/libraries 等）
    // 這樣才能做到「解壓即用」，不依賴官方啟動器先安裝版本。
    await fsp.mkdir(paths.gameDir, { recursive: true });
    await copyDir(srcRoot, paths.gameDir);
    // Windows 上 zip/複製後可能帶到唯讀屬性，導致某些模組無法寫入 config
    await ensureWritableTree(paths.gameDir);

    // 嘗試自動偵測要啟動的版本 ID（優先 fabric-loader-*）
    const detected = await detectLaunchVersionId(
      paths.gameDir,
      settings.minecraftVersion,
    );
    if (detected) {
      await writeInstanceMeta({ launchVersionId: detected });
    }

    const remoteVersion =
      typeof manifest.version === "string" ? manifest.version : "";
    if (remoteVersion)
      await writeInstanceMeta({
        localVersion: remoteVersion,
        installedAt: Date.now(),
      });
    sendSyncDone("安裝/更新完成（zip）");
    return;
  }

  const algo = (manifest.hashAlgo || "sha1").toLowerCase();
  if (!["sha1", "md5"].includes(algo)) {
    throw new Error(`不支援的 hashAlgo：${algo}（只支援 sha1 / md5）`);
  }

  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (files.length === 0) {
    throw new Error("manifest.files 為空，無法安裝。");
  }

  // 依你需求：以 mods/config 為主（也可擴充）
  const allowedRoots = new Set([
    "mods",
    "config",
    "resourcepacks",
    "shaderpacks",
    "scripts",
    "kubejs",
  ]);
  const targets = files.filter((f) => {
    const p = String(f.path || "");
    const root = p.split(/[\\/]/)[0];
    return allowedRoots.has(root);
  });

  let toDownload = [];
  let checked = 0;
  for (const f of targets) {
    checked += 1;
    const relPath = String(f.path);
    const absPath = path.join(paths.gameDir, relPath);
    sendSyncProgress(`比對檔案：${relPath}`, checked / (targets.length + 1));

    const expected = String(f.hash || "").toLowerCase();
    if (!expected) {
      toDownload.push(f);
      continue;
    }

    try {
      await fsp.access(absPath, fs.constants.F_OK);
      const localHash = (await hashFile(absPath, algo)).toLowerCase();
      if (localHash !== expected) toDownload.push(f);
    } catch {
      toDownload.push(f);
    }
  }

  if (toDownload.length === 0) {
    // 沒檔案要下載也要更新版本號（避免 UI 一直顯示可更新）
    const remoteVersion =
      typeof manifest.version === "string" ? manifest.version : "";
    if (remoteVersion)
      await writeInstanceMeta({
        localVersion: remoteVersion,
        installedAt: Date.now(),
      });
    sendSyncDone("已是最新（無需下載）");
    return;
  }

  // 4) 下載到 .temp，再搬運覆蓋（避免中斷造成半套檔案）
  let done = 0;
  for (const f of toDownload) {
    done += 1;
    const relPath = String(f.path);
    const finalAbs = path.join(paths.gameDir, relPath);
    const url = resolveFileUrl(manifest, f);

    const tempAbs = path.join(paths.tempDir, instanceId, relPath);
    let lastPct = 0;
    await downloadToFile(
      url,
      tempAbs,
      ({ received, total }) => {
        const filePct = total > 0 ? received / total : 0;
        const overall = (done - 1 + filePct) / toDownload.length;
        const pct100 = Math.round(overall * 100);
        if (pct100 !== lastPct) {
          lastPct = pct100;
          sendSyncProgress(
            `下載中 (${done}/${toDownload.length})：${relPath}`,
            overall,
          );
        }
      },
      { resume: true, label: "實例檔案" },
    );

    // hash 驗證（可選但建議）
    if (f.hash) {
      const got = (await hashFile(tempAbs, algo)).toLowerCase();
      if (got !== String(f.hash).toLowerCase()) {
        throw new Error(`雜湊驗證失敗：${relPath}`);
      }
    }

    // 搬運覆蓋
    await ensureDirForFile(finalAbs);
    await fsp.copyFile(tempAbs, finalAbs);
  }

  const remoteVersion =
    typeof manifest.version === "string" ? manifest.version : "";
  if (remoteVersion)
    await writeInstanceMeta({
      localVersion: remoteVersion,
      installedAt: Date.now(),
    });

  sendSyncDone(`安裝/更新完成（已同步 ${toDownload.length} 個檔案）`);
}

// =========================
// (B) Minecraft 啟動（Fabric 1.21.1 骨架）
// =========================
// 注意：真正的 Minecraft Launcher 會牽涉到：
// - 官方帳號 OAuth / Token
// - 版本 JSON 解析、libraries classpath 組裝
// - assets、natives、log configs
//
// 這裡先給你「可跑通流程」的骨架：
// 1) 找 Java（找不到就提示安裝）
// 2) 讀取你本地的 Fabric 版本檔（若沒有就提示先安裝一次 Fabric 1.20.1）
// 3) 組出標準 JVM 參數與 classpath（簡化示範）
//
// 如果你希望「完全自動下載 Fabric / Minecraft 本體」，下一步我也能幫你補齊。

async function getBundledJavaExe(paths) {
  const bundled = path.join(paths.jdkDir, "bin", "java.exe");
  try {
    await fsp.access(bundled, fs.constants.F_OK);
    return bundled;
  } catch {
    return "";
  }
}

function mbFromGb(gb) {
  const n = Number(gb);
  if (!Number.isFinite(n) || n <= 0) return 4096;
  return Math.round(n * 1024);
}

function buildOptimizedJvmArgs({ minMemoryMb, maxMemoryMb, nativesDir }) {
  // Java 21：Minecraft/Fabric 通常以 G1GC 最穩健（預設也是 G1，但這裡明確指定並加一些低風險調整）
  const xmx = Math.max(1024, Math.floor(Number(maxMemoryMb) || 4096));
  let xms = Math.floor(Number(minMemoryMb) || 0);
  if (!Number.isFinite(xms) || xms <= 0) xms = Math.min(1024, xmx);
  if (xms > xmx) xms = xmx;

  return [
    `-Xms${xms}M`,
    `-Xmx${xmx}M`,
    "-Dfile.encoding=UTF-8",
    `-Djava.library.path=${nativesDir}`,

    // GC / 記憶體（低風險、通用）
    "-XX:+UseG1GC",
    "-XX:+ParallelRefProcEnabled",
    "-XX:MaxGCPauseMillis=100",
    "-XX:+UseStringDeduplication",

    // 一些常見建議（不影響相容性）
    "-XX:+DisableExplicitGC",
  ];
}

async function launchMinecraftFabric1211({
  gameDir,
  memoryGb,
  playerId,
  minecraftVersion,
  jdkDir,
}) {
  sendMcStatus("正在準備啟動參數…");

  // 確保目錄存在
  await fsp.mkdir(gameDir, { recursive: true });
  await ensureWritableTree(gameDir);

  const javaExe = path.join(jdkDir, "bin", "java.exe");
  try {
    await fsp.access(javaExe, fs.constants.F_OK);
  } catch {
    dialog.showMessageBox({
      type: "warning",
      title: "找不到 Java",
      message:
        "找不到內建 Java。請先按『安裝/更新』讓啟動器自動安裝 Java 依賴。",
    });
    throw new Error("找不到 Java。");
  }

  // 新需求：從實例內的 versions/ 自動偵測 Fabric/Minecraft 版本並啟動
  const meta = await readInstanceMeta();
  let launchVersionId = String(meta.launchVersionId || "").trim();
  if (!launchVersionId) {
    launchVersionId = await detectLaunchVersionId(gameDir, minecraftVersion);
  }

  if (!launchVersionId) {
    dialog.showMessageBox({
      type: "info",
      title: "找不到可啟動版本",
      message:
        "在實例資料夾中找不到可啟動的版本檔（versions/*/*.json）。\n\n" +
        "請確認你的 instance.zip 內包含完整的 .minecraft 結構（至少要有 versions/ 與對應的 libraries/）。",
    });
    throw new Error("找不到可啟動版本。");
  }

  const resolved = await resolveVersionChain({
    gameDir,
    versionId: launchVersionId,
  });
  const mainClass = String(resolved.mainClass || "").trim();
  if (!mainClass) throw new Error("版本 JSON 缺少 mainClass。");

  // Fabric 版本通常 inheritsFrom 原版，因此可能沒有 <fabricId>.jar
  // 若不存在，fallback 到 baseJarId（通常是原版 Minecraft 的 jar）
  const preferredJar = path.join(
    gameDir,
    "versions",
    resolved.id,
    `${resolved.id}.jar`,
  );
  const baseId = String(resolved.baseJarId || minecraftVersion || "").trim();
  const baseJar = baseId
    ? path.join(gameDir, "versions", baseId, `${baseId}.jar`)
    : "";

  let versionJarPath = preferredJar;
  try {
    await fsp.access(preferredJar, fs.constants.F_OK);
  } catch {
    if (!baseJar) throw new Error(`找不到版本 jar：${preferredJar}`);
    versionJarPath = baseJar;
    try {
      await fsp.access(baseJar, fs.constants.F_OK);
    } catch {
      throw new Error(`找不到版本 jar：\n${preferredJar}\n或\n${baseJar}`);
    }
  }

  const cp = buildClasspath({
    gameDir,
    versionJarPath,
    libraries: resolved.libraries,
  });
  const nativesDir = path.join(gameDir, "natives");
  await fsp.mkdir(nativesDir, { recursive: true });

  const settings = await readSettings();
  const maxMb = settings?.maxMemoryGb
    ? mbFromGb(settings.maxMemoryGb)
    : mbFromGb(memoryGb);
  const minMb = settings?.minMemoryGb ? mbFromGb(settings.minMemoryGb) : 0;
  const placeholders = {
    auth_player_name: playerId || "Player001",
    version_name: resolved.id,
    game_directory: gameDir,
    assets_root: path.join(gameDir, "assets"),
    // 重要：--assetIndex 應該使用 version json 的 assetIndex.id（例如 "29"）
    // 若錯把 minecraftVersion（例如 "1.21.11"）當 assetIndex，遊戲會找不到 indexes/<id>.json
    // 進而造成語言清單只剩 en_us 等資源不完整的現象。
    assets_index_name: String(
      resolved.assetIndex || minecraftVersion || "1.21.11",
    ),
    auth_uuid: "00000000-0000-0000-0000-000000000000",
    auth_access_token: "0",
    user_type: "mojang",
    version_type: "release",
    natives_directory: nativesDir,
    classpath: cp,
  };

  // 啟動參數（資源相關）已透過 ensureRequiredGameArgs 保證存在

  const jvmArgs = buildOptimizedJvmArgs({
    minMemoryMb: minMb,
    maxMemoryMb: maxMb,
    nativesDir,
  });

  const gameArgs = ensureRequiredGameArgs(
    buildGameArgsFromVersionJson(resolved, placeholders),
    placeholders,
  );
  const args = [...jvmArgs, "-cp", cp, mainClass, ...gameArgs];

  sendMcStatus("正在啟動遊戲…");

  // 重要：讓遊戲行程與啟動器解耦
  // 否則關閉啟動器時，Windows 可能會連帶結束 Java/Minecraft，造成「關啟動器=遊戲崩潰」。
  // 先清一次殘留狀態（避免明明關掉了，但 child handle/PID 狀態沒更新）
  cleanupStaleMcProcessIfNeeded();
  if (runningMcProcess && runningMcProcess.exitCode === null) {
    throw new Error("遊戲已在執行中，請先關閉遊戲後再啟動。");
  }
  const p = spawn(javaExe, args, {
    cwd: gameDir,
    windowsHide: false,
    detached: true,
    stdio: "ignore",
  });
  p.unref();
  runningMcProcess = p;
  sendMcRunning(true);

  // 啟動 Discord Rich Presence helper（讓啟動器可關閉，狀態仍可持續）
  void tryStartDiscordRpcHelper({ settings, mcPid: p.pid });

  // detached + stdio ignore：不再接 stdout/stderr，避免 launcher 退出影響遊戲

  // 用一次性 finalize 統一回收狀態，避免按鈕卡在「遊戲執行中」。
  let finalized = false;
  const finalize = (code, reason) => {
    if (finalized) return;
    finalized = true;
    runningMcProcess = null;
    sendMcRunning(false);
    if (typeof code === "number") {
      sendMcStatus(code === 0 ? "遊戲已結束" : `遊戲已結束（code=${code}）`);
    } else if (reason) {
      sendMcStatus(`遊戲已結束（${reason}）`);
    } else {
      sendMcStatus("遊戲已結束");
    }
  };

  p.once("exit", (code) => finalize(code, "exit"));
  p.once("close", (code) => finalize(code, "close"));
  p.once("error", (err) => {
    console.log("[MC:SPAWN_ERR]", String(err?.message ?? err));
    finalize(undefined, "error");
  });
}

async function ensureWritableTree(rootDir) {
  // 僅確保必要資料夾存在；不再做唯讀/ACL 修復或刪除設定檔。
  const dirs = [
    rootDir,
    path.join(rootDir, "config"),
    path.join(rootDir, "downloads"),
    path.join(rootDir, "logs"),
    path.join(rootDir, "crash-reports"),
  ];
  for (const d of dirs) {
    try {
      await fsp.mkdir(d, { recursive: true });
    } catch {}
  }
}

async function detectLaunchVersionId(gameDir, preferredMcVersion = "") {
  const versionsDir = path.join(gameDir, "versions");
  let entries;
  try {
    entries = await fsp.readdir(versionsDir, { withFileTypes: true });
  } catch {
    return "";
  }

  const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (ids.length === 0) return "";

  const pref = String(preferredMcVersion || "").trim();

  // 0) 只留下「真的有 <id>.json」的版本資料夾
  const validIds = [];
  for (const id of ids) {
    const jsonPath = path.join(versionsDir, id, `${id}.json`);
    try {
      await fsp.access(jsonPath, fs.constants.F_OK);
      validIds.push(id);
    } catch {}
  }
  if (validIds.length === 0) return "";

  // 1) 優先找 fabric-loader 且包含偏好版本字串（例如 1.21.11）
  if (pref) {
    const hit = validIds.find(
      (id) => id.toLowerCase().includes("fabric-loader") && id.includes(pref),
    );
    if (hit) return hit;
  }

  // 2) 再找任何 fabric-loader-*（通常就是你要的：fabric-loader-0.18.6-1.21.11）
  const anyFabric = validIds.find((id) =>
    id.toLowerCase().includes("fabric-loader"),
  );
  if (anyFabric) return anyFabric;

  // 3) 最後 fallback：偏好 Minecraft 版本資料夾
  if (pref) {
    const mc = validIds.find((id) => id === pref);
    if (mc) return mc;
  }

  // 4) 隨便找第一個
  return validIds[0];
}

async function findMinecraftRoot(extractDir) {
  // 回傳「包含 versions/<id>/<id>.json」的資料夾
  async function hasVersionsJson(dir) {
    const versionsDir = path.join(dir, "versions");
    try {
      const entries = await fsp.readdir(versionsDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const id = e.name;
        const jsonPath = path.join(versionsDir, id, `${id}.json`);
        try {
          await fsp.access(jsonPath, fs.constants.F_OK);
          return true;
        } catch {}
      }
      return false;
    } catch {
      return false;
    }
  }

  // 1) extractDir 本身就是 .minecraft 根
  if (await hasVersionsJson(extractDir)) return extractDir;

  // 2) extractDir/.minecraft
  const dotMc = path.join(extractDir, ".minecraft");
  try {
    const st = await fsp.stat(dotMc);
    if (st.isDirectory() && (await hasVersionsJson(dotMc))) return dotMc;
  } catch {}

  // 3) 如果根目錄只有一個資料夾，或有多個資料夾：掃描第一層 + 第二層的 ".minecraft" 或直接有 versions 的資料夾
  let level1;
  try {
    level1 = await fsp.readdir(extractDir, { withFileTypes: true });
  } catch {
    return "";
  }

  const dirs1 = level1
    .filter((e) => e.isDirectory())
    .map((e) => path.join(extractDir, e.name));
  for (const d of dirs1) {
    if (await hasVersionsJson(d)) return d;
    const dDot = path.join(d, ".minecraft");
    try {
      const st = await fsp.stat(dDot);
      if (st.isDirectory() && (await hasVersionsJson(dDot))) return dDot;
    } catch {}
  }

  // 4) 第二層掃描（最多再往下一層，避免掃太深）
  for (const d of dirs1) {
    let level2;
    try {
      level2 = await fsp.readdir(d, { withFileTypes: true });
    } catch {
      continue;
    }
    const dirs2 = level2
      .filter((e) => e.isDirectory())
      .map((e) => path.join(d, e.name));
    for (const dd of dirs2) {
      if (await hasVersionsJson(dd)) return dd;
      const ddDot = path.join(dd, ".minecraft");
      try {
        const st = await fsp.stat(ddDot);
        if (st.isDirectory() && (await hasVersionsJson(ddDot))) return ddDot;
      } catch {}
    }
  }

  return "";
}

async function findMinecraftRootFallback(extractDir) {
  // 當 zip 是「輕量包」（沒有 versions/）時，用這個 fallback。
  // 優先使用 .minecraft（如果存在），否則用 extractDir 本身。
  const dotMc = path.join(extractDir, ".minecraft");
  try {
    const st = await fsp.stat(dotMc);
    if (st.isDirectory()) return dotMc;
  } catch {}

  // 若根目錄只有一個資料夾，且它看起來像 instance 內容（有 mods/config 等），就用那個
  try {
    const entries = await fsp.readdir(extractDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    if (dirs.length === 1) return path.join(extractDir, dirs[0].name);
  } catch {}

  return extractDir;
}

async function readJsonFile(p) {
  const raw = await fsp.readFile(p, "utf8");
  return JSON.parse(raw);
}

function uniqByKey(list, keyFn) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function libraryKey(lib) {
  const name = lib?.name;
  if (typeof name === "string" && name.trim()) return `name:${name.trim()}`;
  const artPath = lib?.downloads?.artifact?.path;
  if (typeof artPath === "string" && artPath.trim())
    return `path:${artPath.trim()}`;
  return `json:${JSON.stringify(lib)}`;
}

function mergeLibraries(parentLibs, childLibs) {
  // 以「後者覆蓋前者」的方式合併，並保留最後一次出現的順序
  const m = new Map();
  const combined = [
    ...(Array.isArray(parentLibs) ? parentLibs : []),
    ...(Array.isArray(childLibs) ? childLibs : []),
  ];
  for (const lib of combined) {
    const k = libraryKey(lib);
    if (m.has(k)) m.delete(k); // 讓順序移到最後
    m.set(k, lib);
  }
  return [...m.values()];
}

async function resolveVersionChain({ gameDir, versionId }) {
  // 讀取 versions/<id>/<id>.json，並處理 inheritsFrom（常見於 Fabric）
  const visited = new Set();

  async function load(id) {
    if (!id) throw new Error("versionId 為空");
    if (visited.has(id)) throw new Error(`版本繼承循環：${id}`);
    visited.add(id);

    const jsonPath = path.join(gameDir, "versions", id, `${id}.json`);
    const data = await readJsonFile(jsonPath);

    if (data && typeof data.inheritsFrom === "string" && data.inheritsFrom) {
      const parent = await load(String(data.inheritsFrom));
      return mergeVersionJson(parent, data);
    }
    return normalizeVersionJson(id, data);
  }

  return await load(versionId);
}

function normalizeVersionJson(id, data) {
  const libraries = Array.isArray(data?.libraries) ? data.libraries : [];
  const assetIndex =
    typeof data?.assetIndex === "string"
      ? String(data.assetIndex)
      : data?.assetIndex?.id
        ? String(data.assetIndex.id)
        : "";
  return {
    id: String(data?.id || id),
    baseJarId: String(data?.baseJarId || data?.id || id),
    mainClass: String(data?.mainClass || ""),
    assetIndex,
    arguments: data?.arguments,
    minecraftArguments:
      typeof data?.minecraftArguments === "string"
        ? data.minecraftArguments
        : "",
    libraries,
  };
}

function mergeVersionJson(parent, child) {
  // parent/child 可能已是 normalizeVersionJson 的輸出
  // 因此 normalizeVersionJson 需同時支援 raw version json 與 normalized 物件。
  const p = normalizeVersionJson(parent?.id || "", parent);
  const c = normalizeVersionJson(child?.id || "", child);
  const libs = mergeLibraries(p.libraries || [], c.libraries || []);
  return {
    id: c.id || p.id,
    baseJarId: p.baseJarId || p.id,
    mainClass: c.mainClass || p.mainClass,
    assetIndex: c.assetIndex || p.assetIndex,
    arguments: c.arguments || p.arguments,
    minecraftArguments: c.minecraftArguments || p.minecraftArguments,
    libraries: libs,
  };
}

function buildClasspath({ gameDir, versionJarPath, libraries }) {
  const libs = Array.isArray(libraries) ? libraries : [];
  const parts = [];
  for (const lib of libs) {
    const artifactPath = lib?.downloads?.artifact?.path;
    if (artifactPath && typeof artifactPath === "string") {
      const abs = path.join(gameDir, "libraries", artifactPath);
      parts.push(abs);
    } else if (typeof lib?.name === "string") {
      // fallback：無 downloads.path 時嘗試用 maven 座標推導（不一定成功）
      const m = lib.name.split(":");
      if (m.length >= 3) {
        const group = m[0].replace(/\./g, "/");
        const artifact = m[1];
        const ver = m[2];
        const file = `${artifact}-${ver}.jar`;
        parts.push(path.join(gameDir, "libraries", group, artifact, ver, file));
      }
    }
  }
  parts.push(versionJarPath);
  return parts.join(";");
}

function replacePlaceholders(s, map) {
  return String(s).replace(/\$\{([^}]+)\}/g, (_m, key) => {
    const k = String(key);
    return Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : _m;
  });
}

function buildGameArgsFromVersionJson(v, placeholders) {
  // 優先走新版 arguments.game；否則走舊版 minecraftArguments
  const out = [];
  const argsObj = v?.arguments;
  if (argsObj && Array.isArray(argsObj.game)) {
    for (const item of argsObj.game) {
      if (typeof item === "string")
        out.push(replacePlaceholders(item, placeholders));
      else if (item && typeof item === "object" && Array.isArray(item.value)) {
        // 先不處理 rules；新手/離線模式先全部放行 value
        for (const s of item.value)
          out.push(replacePlaceholders(s, placeholders));
      } else if (
        item &&
        typeof item === "object" &&
        typeof item.value === "string"
      ) {
        out.push(replacePlaceholders(item.value, placeholders));
      }
    }
    return out;
  }

  const legacy = String(v?.minecraftArguments || "").trim();
  if (!legacy) {
    // 最小 fallback
    return [
      "--username",
      placeholders.auth_player_name,
      "--gameDir",
      placeholders.game_directory,
      "--assetsDir",
      placeholders.assets_root,
      "--assetIndex",
      placeholders.assets_index_name,
      "--uuid",
      placeholders.auth_uuid,
      "--accessToken",
      placeholders.auth_access_token,
      "--userType",
      placeholders.user_type,
      "--version",
      placeholders.version_name,
    ];
  }
  return legacy
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => replacePlaceholders(t, placeholders));
}

function ensureRequiredGameArgs(gameArgs, placeholders) {
  const args = Array.isArray(gameArgs) ? [...gameArgs] : [];
  const setIfMissing = (flag, value) => {
    if (!flag) return;
    if (args.includes(flag)) return;
    args.push(flag, String(value ?? ""));
  };

  setIfMissing("--username", placeholders.auth_player_name);
  setIfMissing("--gameDir", placeholders.game_directory);
  setIfMissing("--assetsDir", placeholders.assets_root);
  setIfMissing("--assetIndex", placeholders.assets_index_name);
  setIfMissing("--uuid", placeholders.auth_uuid);
  setIfMissing("--accessToken", placeholders.auth_access_token);
  setIfMissing("--userType", placeholders.user_type);
  setIfMissing("--version", placeholders.version_name);
  return args;
}

// =========================
// (B) 內建 Java 自動安裝（Temurin 21 - JRE）
// =========================
// Minecraft 1.21.x 系列通常建議 Java 21。
// 這裡優先使用可快速下載的 zip runtime（JRE），必要時才 fallback Mojang runtime（多檔案）。

async function ensureBundledJava({ settings, paths }) {
  sendSyncStatus("檢查 Java 依賴…");
  sendSyncProgress("檢查 Java 依賴…", 0.02);

  const javaExe = await getBundledJavaExe(paths);
  if (javaExe) {
    sendSyncStatus("Java 依賴已就緒");
    return;
  }

  // 下載 zip 到 .temp，再解壓到 jdkDir
  sendSyncStatus("正在下載 Java Runtime（JRE 21）…");
  await fsp.mkdir(paths.tempDir, { recursive: true });

  const zulu = await getZuluWindowsJre21ZipUrl();
  const semeru = await getSemeruWindowsJre21ZipUrl();

  // 多來源備援：同一套 Adoptium API 的不同分流，通常會落到不同 CDN/節點
  // 也允許用環境變數指定自訂鏡像（例如公司內網 cache）
  const envMirror = String(process.env.GGL_JAVA_MIRROR_URL || "").trim();
  const sources = [
    envMirror ? { name: "自訂鏡像", url: envMirror } : null,
    zulu?.url
      ? { name: "Azul Zulu", url: zulu.url, sha256: zulu.sha256 }
      : null,
    semeru?.url
      ? { name: "IBM Semeru", url: semeru.url, sha256: semeru.sha256 }
      : null,
    {
      name: "Adoptium(eclipse)",
      url: "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse",
    },
    {
      name: "Adoptium(adoptium)",
      url: "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/adoptium",
    },
  ].filter(Boolean);

  // 快速測速：挑最快的先下載，降低卡住機率
  const orderedSources = await rankSourcesByQuickProbe(sources);

  const zipPath = path.join(paths.tempDir, "jre21.zip");

  // 注意：部分端點可能不回 content-length；此時用估算總量讓進度條仍可推進。
  // 同時在狀態欄顯示：百分比 + MB/s + ETA
  let lastUiBucket = -1;
  let lastAt = Date.now();
  let lastBytes = 0;
  let emaSpeedBps = 0;
  try {
    const used = await downloadToFileWithFallback(
      orderedSources,
      zipPath,
      ({ received, total }) => {
        const mb = received / (1024 * 1024);
        const totalMb = total > 0 ? total / (1024 * 1024) : 0;

        // JRE zip 通常明顯小於 JDK；取 120MB 當估算上限（只用於 total=0 的情況）
        const estimatedTotal = total > 0 ? total : 120 * 1024 * 1024;
        const p =
          estimatedTotal > 0
            ? Math.max(0, Math.min(1, received / estimatedTotal))
            : 0;

        const now = Date.now();
        const dtMs = Math.max(1, now - lastAt);
        const dBytes = Math.max(0, received - lastBytes);
        const instBps = (dBytes * 1000) / dtMs;
        emaSpeedBps =
          emaSpeedBps > 0 ? emaSpeedBps * 0.85 + instBps * 0.15 : instBps;
        lastAt = now;
        lastBytes = received;

        const remainBytes = Math.max(0, estimatedTotal - received);
        const etaSec = emaSpeedBps > 1 ? remainBytes / emaSpeedBps : 0;
        const speedMb = emaSpeedBps / (1024 * 1024);

        // UI 節流：每 1MB 更新一次，避免狂刷
        const bucket = Math.floor(mb);
        if (bucket === lastUiBucket) return;
        lastUiBucket = bucket;

        const pct = `${Math.round(p * 100)}%`;
        const speedStr = `${speedMb.toFixed(2)}MB/s`;
        const etaStr = `ETA ${formatEtaSeconds(etaSec)}`;
        const sizeStr =
          total > 0
            ? `${mb.toFixed(0)}/${totalMb.toFixed(0)}MB`
            : `${mb.toFixed(0)}MB/?`;
        const text = `Java(JRE) ${pct} · ${sizeStr} · ${speedStr} · ${etaStr}`;
        sendSyncProgress(text, 0.02 + p * 0.45);
      },
      { resume: true },
    );

    // 若鏡像有提供 sha256，就先驗證 zip 完整性再解壓
    await verifyFileSha256IfProvided(zipPath, used?.sha256);

    // 不再以「上次鏡像」做優先策略；每次都以 quick probe 選最快來源
  } catch (zipErr) {
    // 最後備援：Mojang 官方 runtime（很多小檔案）
    try {
      await ensureBundledJavaFromMojang(paths);
      return; // 重要：Mojang 成功就結束，不再走 zip 解壓流程
    } catch {
      throw zipErr;
    }
  }

  sendSyncStatus("正在安裝 Java 依賴…");
  sendSyncProgress("正在安裝 Java 依賴…", 0.55);

  // 解壓 zip
  const extractZip = require("extract-zip");
  const extractDir = path.join(paths.tempDir, "jdk-extract");
  await fsp.rm(extractDir, { recursive: true, force: true });
  await fsp.mkdir(extractDir, { recursive: true });
  await extractZip(zipPath, { dir: extractDir });

  // zip 通常會有一層根資料夾，例如 jdk-21.0.x+xx
  const entries = await fsp.readdir(extractDir, { withFileTypes: true });
  const rootFolder = entries.find((e) => e.isDirectory());
  if (!rootFolder) throw new Error("Java 解壓失敗：找不到根資料夾。");

  const extractedJdkRoot = path.join(extractDir, rootFolder.name);

  // 清空舊的 jdkDir 再覆蓋（避免殘留）
  await fsp.rm(paths.jdkDir, { recursive: true, force: true });
  await fsp.mkdir(paths.jdkDir, { recursive: true });

  // 優化：同磁碟下用 rename 取代 copy（快很多）；失敗再 fallback copyDir
  try {
    await fsp.rename(extractedJdkRoot, paths.jdkDir);
  } catch {
    await copyDir(extractedJdkRoot, paths.jdkDir);
  }

  const javaExe2 = await getBundledJavaExe(paths);
  if (!javaExe2) throw new Error("Java 安裝後仍找不到 bin\\java.exe");

  sendSyncStatus("Java 依賴安裝完成");
  sendSyncProgress("Java 依賴安裝完成", 0.72);
}

async function ensureBundledJavaFromMojang(paths) {
  // Mojang runtime 是「檔案清單」，不是單一 zip。只在 zip 鏡像都不行時才用。
  sendSyncStatus("改用 Mojang 官方 Java Runtime（最後備援）…");
  sendSyncProgress("改用 Mojang 官方 Java Runtime（最後備援）…", 0.03);

  const allUrl =
    "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";
  const all = await (
    await fetchWithNiceError(allUrl, { cache: "no-store", timeoutMs: 8000 })
  ).json();
  const delta = all?.["windows-x64"]?.["java-runtime-delta"];
  const entry = Array.isArray(delta) ? delta[0] : null;
  const manifestUrl = String(entry?.manifest?.url || "").trim();
  if (!manifestUrl)
    throw new Error(
      "Mojang runtime manifest 不存在（windows-x64/java-runtime-delta）。",
    );

  const maniRes = await fetchWithNiceError(manifestUrl, {
    cache: "no-store",
    timeoutMs: 8000,
  });
  if (!maniRes.ok)
    throw new Error(`Mojang runtime manifest 下載失敗：HTTP ${maniRes.status}`);
  const manifest = await maniRes.json();
  const files =
    manifest?.files && typeof manifest.files === "object" ? manifest.files : {};

  // 確保目標存在（沿用 paths.jdkDir）
  await fsp.rm(paths.jdkDir, { recursive: true, force: true });
  await fsp.mkdir(paths.jdkDir, { recursive: true });

  const entries = Object.entries(files);
  const fileEntries = entries.filter(
    ([, v]) =>
      v && typeof v === "object" && v.type === "file" && v.downloads?.raw?.url,
  );
  const totalBytes = fileEntries.reduce(
    (sum, [, v]) => sum + Number(v.downloads.raw.size || 0),
    0,
  );
  let doneBytes = 0;
  let lastUiBucket = -1;
  const inFlight = new Map(); // rel -> received bytes
  let lastAt = Date.now();
  let lastBytes = 0;
  let emaSpeedBps = 0;

  const getCurBytes = () => {
    let inflightSum = 0;
    for (const v of inFlight.values()) inflightSum += Number(v || 0);
    return doneBytes + inflightSum;
  };

  const bumpUi = () => {
    const cur = getCurBytes();
    const mb = cur / (1024 * 1024);
    const bucket = Math.floor(mb);
    if (bucket === lastUiBucket) return;
    lastUiBucket = bucket;
    const p = totalBytes > 0 ? cur / totalBytes : 0;

    const now = Date.now();
    const dtMs = Math.max(1, now - lastAt);
    const dBytes = Math.max(0, cur - lastBytes);
    const instBps = (dBytes * 1000) / dtMs;
    emaSpeedBps =
      emaSpeedBps > 0 ? emaSpeedBps * 0.85 + instBps * 0.15 : instBps;
    lastAt = now;
    lastBytes = cur;

    const remainBytes = Math.max(0, totalBytes - cur);
    const etaSec = emaSpeedBps > 1 ? remainBytes / emaSpeedBps : 0;
    const speedMb = emaSpeedBps / (1024 * 1024);

    const pct = `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
    const totalMb = totalBytes > 0 ? totalBytes / (1024 * 1024) : 0;
    const sizeStr =
      totalBytes > 0
        ? `${mb.toFixed(0)}/${totalMb.toFixed(0)}MB`
        : `${mb.toFixed(0)}MB/?`;
    const speedStr = `${speedMb.toFixed(2)}MB/s`;
    const etaStr = `ETA ${formatEtaSeconds(etaSec)}`;
    sendSyncProgress(
      `Java(Mojang) ${pct} · ${sizeStr} · ${speedStr} · ${etaStr}`,
      0.02 + Math.max(0, Math.min(1, p)) * 0.45,
    );
  };

  // 併發下載（限制併發避免打爆連線/磁碟）
  const CONCURRENCY = 6;
  let idx = 0;
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, fileEntries.length) },
    async () => {
      while (true) {
        const curIdx = idx++;
        if (curIdx >= fileEntries.length) return;
        const [rel, v] = fileEntries[curIdx];
        const url = String(v.downloads.raw.url);
        const sha1 = String(v.downloads.raw.sha1 || "");
        const out = path.join(paths.jdkDir, rel);
        inFlight.set(rel, 0);
        try {
          await downloadToFile(
            url,
            out,
            ({ received }) => {
              inFlight.set(rel, Number(received || 0));
              bumpUi();
            },
            { resume: true, label: "Java(Mojang)" },
          );
          await verifyFileSha1IfProvided(out, sha1);
        } finally {
          inFlight.delete(rel);
          doneBytes += Number(v.downloads.raw.size || 0);
          bumpUi();
        }
      }
    },
  );

  await Promise.all(workers);

  // Mojang runtime 結構內通常有 bin/java.exe；做基本驗證
  const javaExe2 = await getBundledJavaExe(paths);
  if (!javaExe2) throw new Error("Mojang Java 安裝後仍找不到 bin\\java.exe");

  sendSyncStatus("Java 依賴安裝完成（Mojang）");
  sendSyncProgress("Java 依賴安裝完成（Mojang）", 0.72);
}

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(s, d);
    } else if (e.isSymbolicLink()) {
      // Windows zip 可能會有 symlink；保守處理：跳過
      continue;
    } else {
      await fsp.copyFile(s, d);
      // Windows：避免把來源檔案的唯讀屬性一路帶過來，導致模組無法覆寫 config
      try {
        await fsp.chmod(d, 0o666);
      } catch {}
    }
  }
}
