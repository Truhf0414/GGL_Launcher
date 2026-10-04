"use strict";

// 「遊戲是否在跑」：A＝啟動器自己 spawn 的程序（注入），B＝PowerShell 查所有 java 程序的命令列。
// B 失敗（spawn 失敗、逾時、非 0 exit、輸出壞）⇒ unknown。這支只回三值；unknown 時怎麼問玩家由中樞的確認回呼處理
// （→ _notes/plans/instance-sync-v3-commit3b1.md R2、instance-sync-v3-commit3b1a.md §設計「遊戲偵測」）。

const { execFile } = require("child_process");
const {
  cimCommand,
  parseCimJson,
  matchGameDir,
} = require("../../lib/sync/game-running.js");

const POWERSHELL_TIMEOUT_MS = 10_000;

/**
 * 成功（exit 0）⇒ { code: 0, stdout }；spawn 失敗、逾時、非 0 exit 一律 reject。
 * @param {string} command
 */
function runPowerShell(command, { timeoutMs = POWERSHELL_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => (err ? reject(err) : resolve({ code: 0, stdout })),
    );
  });
}

/**
 * @param {{
 *   gameDir: string,
 *   deps: { isMinecraftRunning: () => boolean, runPowerShell?: typeof runPowerShell, filter?: string },
 * }} input
 * @returns {Promise<"running" | "not-running" | "unknown">}
 */
async function checkGameRunning({ gameDir, deps }) {
  if (deps.isMinecraftRunning()) return "running";
  return detectFromProcessList(gameDir, deps);
}

async function detectFromProcessList(gameDir, deps) {
  const run = deps.runPowerShell ?? runPowerShell;
  try {
    const { code, stdout } = await run(cimCommand(deps.filter));
    if (code !== 0) return "unknown";
    return matchGameDir(parseCimJson(stdout), gameDir);
  } catch {
    return "unknown";
  }
}

module.exports = { checkGameRunning, runPowerShell, POWERSHELL_TIMEOUT_MS };
