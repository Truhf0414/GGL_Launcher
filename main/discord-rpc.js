// Discord Rich Presence：啟動 rpc-helper.exe（與 MC PID 綁定），按鈕 URL 白名單
const path = require("path");
const fsp = require("fs/promises");
const fs = require("fs");
const { spawn } = require("child_process");
const { URL } = require("url");
const { app } = require("electron");
const {
  getDebugLoggingEnabled,
  appendLauncherLog,
  appendRpcDiagLog,
} = require("./launcher-log");
const mainWindowModule = require("./main-window");

/** @type {() => import("electron").BrowserWindow | null} */
let getMainWindow = () => mainWindowModule.getMainWindow();

function configureDiscordRpc(deps = {}) {
  if (typeof deps.getMainWindow === "function") {
    getMainWindow = deps.getMainWindow;
  }
}

function normalizeAllowedHosts(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  for (const h of list) {
    const s = String(h ?? "")
      .trim()
      .toLowerCase();
    if (s) seen.add(s);
  }
  return Array.from(seen);
}

function filterButtonUrl(url, allowedHosts) {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u)) return "";
  const hosts = normalizeAllowedHosts(allowedHosts);
  if (hosts.length === 0) return u;
  try {
    const host = new URL(u).hostname.toLowerCase();
    return hosts.includes(host) ? u : "";
  } catch {
    return "";
  }
}

function sendRpcNotice(text) {
  try {
    getMainWindow()?.webContents?.send("rpc:notice", {
      text: String(text || ""),
    });
  } catch {}
}

function resolveDiscordRpcHelperExePath() {
  // dev：專案根目錄 / packaged：resourcesPath（由打包器配置 extraResources）
  const base = app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, "..");
  return path.join(base, "assets", "rpc-helper.exe");
}

function getDiscordClientIdFromEnvOrSettings(settings) {
  const env = String(process.env.GGL_DISCORD_CLIENT_ID || "").trim();
  if (env) return env;
  return String(settings?.discordClientId || "").trim();
}

async function tryStartDiscordRpcHelper({ settings, mcPid }) {
  const pid = Number(mcPid);
  if (!Number.isFinite(pid) || pid <= 0) {
    void appendRpcDiagLog(`skip: invalid mcPid=${String(mcPid)}`);
    return;
  }

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
  const joinUrl = filterButtonUrl(
    settings?.discordButtonJoinServerUrl || "",
    settings?.discordAllowedButtonHosts,
  );
  const dlUrl = filterButtonUrl(
    settings?.discordButtonDownloadLauncherUrl || "",
    settings?.discordAllowedButtonHosts,
  );
  const debugRpc = getDebugLoggingEnabled();
  const args = [
    "--clientId",
    clientId,
    "--pid",
    String(pid),
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
    debugRpc ? "1" : "0",
    ...(debugRpc
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
      `started helper pid=${p.pid} mcPid=${pid} helper=${helperExe}`,
    );
  } catch (e) {
    void appendLauncherLog(
      `DISCORD_RPC start failed: ${String(e?.message ?? e)}`,
    );
    void appendRpcDiagLog(`start failed: ${String(e?.message ?? e)}`);
    sendRpcNotice("Discord 狀態啟動失敗（helper 無法啟動）");
  }
}

module.exports = {
  configureDiscordRpc,
  tryStartDiscordRpcHelper,
};
