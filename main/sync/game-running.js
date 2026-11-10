"use strict";

// 「遊戲是否在跑」：A＝啟動器自己 spawn 的程序（注入），B＝查所有 java 程序的命令列。
// B 用哪種指令照平台資料的 processList（lib/platform.js）：Windows＝PowerShell 查 CIM，其他＝ps。
// B 失敗（spawn 失敗、逾時、非 0 exit、輸出壞）⇒ unknown。這支只回三值；unknown 時怎麼問玩家由中樞的確認回呼處理
// （→ _notes/plans/instance-sync-v3-commit3b1.md R2、instance-sync-v3-commit3b1a.md §設計「遊戲偵測」）。

const { execFile } = require("child_process");
const {
  cimCommand,
  parseCimJson,
  PS_ARGS,
  parsePsOutput,
  matchGameDir,
} = require("../../lib/sync/game-running.js");

/** 兩種指令共用的逾時與輸出上限 */
const PROCESS_LIST_TIMEOUT_MS = 10_000;
const PROCESS_LIST_MAX_BUFFER = 64 * 1024 * 1024;

/**
 * 成功（exit 0）⇒ { code: 0, stdout }；spawn 失敗、逾時、非 0 exit 一律 reject。
 * @param {string} command
 */
function runPowerShell(command, { timeoutMs = PROCESS_LIST_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: PROCESS_LIST_MAX_BUFFER,
      },
      (err, stdout) => (err ? reject(err) : resolve({ code: 0, stdout })),
    );
  });
}

/** 成功（exit 0）⇒ { code: 0, stdout }；spawn 失敗、逾時、非 0 exit 一律 reject。 */
function runPs({ timeoutMs = PROCESS_LIST_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      "ps",
      PS_ARGS,
      { timeout: timeoutMs, maxBuffer: PROCESS_LIST_MAX_BUFFER },
      (err, stdout) => (err ? reject(err) : resolve({ code: 0, stdout })),
    );
  });
}

// 每種 processList 一條路：跑指令 → 解析成 { ProcessId, CommandLine }[]
const LISTERS = {
  cim: async (deps) => {
    const run = deps.runPowerShell ?? runPowerShell;
    const { code, stdout } = await run(cimCommand(deps.filter));
    return code === 0 ? parseCimJson(stdout) : null;
  },
  ps: async (deps) => {
    const run = deps.runPs ?? runPs;
    const { code, stdout } = await run();
    return code === 0 ? parsePsOutput(stdout, deps.filter) : null;
  },
};

/**
 * @param {{
 *   gameDir: string,
 *   deps: {
 *     processList: "cim" | "ps",
 *     isMinecraftRunning: () => boolean,
 *     runPowerShell?: typeof runPowerShell,
 *     runPs?: typeof runPs,
 *     filter?: string | RegExp,
 *   },
 * }} input
 *   processList：平台資料的那一欄。runPowerShell、runPs、filter 是測試縫（正式不注入）；
 *   filter 在 cim 是 CIM 的 -Filter 字串，在 ps 是比對命令列的 RegExp
 * @returns {Promise<"running" | "not-running" | "unknown">}
 */
async function checkGameRunning({ gameDir, deps }) {
  if (!Object.hasOwn(LISTERS, deps.processList)) {
    throw new TypeError(
      `checkGameRunning: 不認得的 processList：${deps.processList}`,
    );
  }
  if (deps.isMinecraftRunning()) return "running";
  return detectFromProcessList(gameDir, deps);
}

async function detectFromProcessList(gameDir, deps) {
  try {
    const entries = await LISTERS[deps.processList](deps);
    if (entries === null) return "unknown";
    return matchGameDir(entries, gameDir);
  } catch {
    return "unknown";
  }
}

module.exports = {
  checkGameRunning,
  runPowerShell,
  runPs,
  PROCESS_LIST_TIMEOUT_MS,
};
