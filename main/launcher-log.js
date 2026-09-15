// Launcher log（避免被遊戲日誌洗掉）+ debug 開關（供主程序與 helper 參數使用）
// electron 在用到時才 require：測試會經 manifest-sync → settings 載入本檔（見 test/helpers/forbid-electron.cjs）
const path = require("path");
const fsp = require("fs/promises");
const {
  computeDebugLoggingEnabled,
} = require("../lib/launcher-debug-logging.js");

let debugLoggingEnabled = false;

function getDebugLoggingEnabled() {
  return debugLoggingEnabled;
}

function setDebugLoggingEnabled(enabled) {
  debugLoggingEnabled = Boolean(enabled);
}

function getLauncherLogPath() {
  const { app } = require("electron");
  return path.join(app.getPath("desktop"), "launcher.log");
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
  if (!debugLoggingEnabled) return;
  try {
    const { app } = require("electron");
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
  const pct = Math.max(0, Math.min(1, Number(progress01) || 0)) * 100;
  const bucket = Math.floor(pct / 5);
  if (
    String(text) !== _logThrottle.syncText ||
    bucket !== _logThrottle.syncPctBucket
  ) {
    _logThrottle.syncText = String(text);
    _logThrottle.syncPctBucket = bucket;
    void appendLauncherLog(`SYNC ${text} ${pct.toFixed(1)}%`);
  }
}

module.exports = {
  computeDebugLoggingEnabled,
  getDebugLoggingEnabled,
  setDebugLoggingEnabled,
  appendLauncherLog,
  appendRpcDiagLog,
  rotateLauncherLogIfTooLarge,
  logSyncProgressThrottled,
};
