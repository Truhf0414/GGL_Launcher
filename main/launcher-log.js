// Launcher log（避免被遊戲日誌洗掉）+ debug 開關（供主程序與 helper 參數使用）
// electron 在用到時才 require：測試會載入本檔（見 test/helpers/forbid-electron.cjs）
const path = require("path");
const fsp = require("fs/promises");

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

function clampPercent(progress01) {
  return Math.max(0, Math.min(1, Number(progress01) || 0)) * 100;
}

// progress01 為 null＝這一步沒有可算的比例（例：verify），只記文字，不寫成 0.0%
function formatSyncProgressLog(text, progress01) {
  if (progress01 === null) return `SYNC ${text}`;
  return `SYNC ${text} ${clampPercent(progress01).toFixed(1)}%`;
}

// 節流的分桶：每 5% 一桶；null 自成一桶（同一段文字只記一次），不能和 0% 同桶
function syncProgressBucket(progress01) {
  return progress01 === null ? null : Math.floor(clampPercent(progress01) / 5);
}

function logSyncProgressThrottled(text, progress01) {
  const bucket = syncProgressBucket(progress01);
  if (
    String(text) !== _logThrottle.syncText ||
    bucket !== _logThrottle.syncPctBucket
  ) {
    _logThrottle.syncText = String(text);
    _logThrottle.syncPctBucket = bucket;
    void appendLauncherLog(formatSyncProgressLog(text, progress01));
  }
}

module.exports = {
  getDebugLoggingEnabled,
  setDebugLoggingEnabled,
  appendLauncherLog,
  appendRpcDiagLog,
  rotateLauncherLogIfTooLarge,
  formatSyncProgressLog,
  syncProgressBucket,
  logSyncProgressThrottled,
};
