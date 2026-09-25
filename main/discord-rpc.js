// Discord Rich Presence：啟動 rpc-helper.exe（與 MC PID 綁定），按鈕 URL 白名單
const path = require("path");
const fsp = require("fs/promises");
const fs = require("fs");
const { spawn } = require("child_process");
const { app } = require("electron");
const { buildDiscordHelperArgs } = require("../lib/discord-helper-args.js");
const {
  getDebugLoggingEnabled,
  appendLauncherLog,
  appendRpcDiagLog,
} = require("./launcher-log");
const mainWindowModule = require("./main-window");

/** @type {() => import("electron").BrowserWindow | null} */
let getMainWindow = () => mainWindowModule.getMainWindow();
/** server-config 的 discord 區塊；未注入時為 null，此時不啟動 helper */
let discordConfig = null;

function configureDiscordRpc(deps = {}) {
  if (typeof deps.getMainWindow === "function") {
    getMainWindow = deps.getMainWindow;
  }
  if (deps.discord && typeof deps.discord === "object") {
    discordConfig = deps.discord;
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

async function tryStartDiscordRpcHelper({ mcPid }) {
  const pid = Number(mcPid);
  if (!Number.isFinite(pid) || pid <= 0) {
    void appendRpcDiagLog(`skip: invalid mcPid=${String(mcPid)}`);
    return;
  }
  if (!discordConfig) {
    void appendRpcDiagLog("skip: discord config not injected");
    return;
  }

  const userData = app.getPath("userData");
  const helperLogPath = path.join(userData, "rpc-helper.log");
  const lockPath = path.join(userData, "rpc-helper.lock");
  const statusPath = path.join(userData, "rpc-helper.status.json");
  const built = buildDiscordHelperArgs({
    discord: discordConfig,
    envClientId: process.env.GGL_DISCORD_CLIENT_ID,
    pid,
    debug: getDebugLoggingEnabled(),
    lockPath,
    helperLogPath,
    statusPath,
  });
  if (!built.ok) {
    void appendRpcDiagLog(
      "skip: missing discord.clientId (lib/server-config.js) and env GGL_DISCORD_CLIENT_ID",
    );
    sendRpcNotice("Discord 狀態未啟用（未設定 Client ID）");
    return;
  }
  const { args } = built;

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

  // 只在 debug logging 開啟時寫檔（appendRpcDiagLog 自己判斷）；驗收時對這行看按鈕網址
  void appendRpcDiagLog(`argv ${JSON.stringify(args)}`);

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
