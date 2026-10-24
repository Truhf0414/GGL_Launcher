"use strict";

// 用假的 ipcMain 實際跑一次 main 的 IPC 註冊（跟正式環境同一個入口：main/ipc/index.js 的 registerAllMainIpc），
// 記下註冊了哪些 channel、由哪支檔註冊。不讀原始碼文字，所以不怕排版。
// 假 ipcMain 只有 handle：註冊端改用別的方法（on、handleOnce、removeHandler…）會直接丟錯，不會漏算。

const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
// registerAllMainIpc 交給各 register* 的是這一層包過的 ipcMain（錯誤換成普通 Error），它不是註冊端
const PLAIN_ERROR_WRAPPER = path.join(ROOT, "lib", "ipc-plain-errors.js");

/** 呼叫 ipcMain.handle 的那支檔（相對 repo 根目錄、正斜線）。 */
function handleCallerFile() {
  const original = Error.prepareStackTrace;
  Error.prepareStackTrace = (_err, callSites) => callSites;
  const callSites = new Error().stack;
  Error.prepareStackTrace = original;
  // [0] 本函式、[1] 假的 handle；之後第一個不在包裝層裡的就是呼叫 handle 的地方
  const caller = callSites
    .slice(2)
    .find((s) => s.getFileName() !== PLAIN_ERROR_WRAPPER);
  return path.relative(ROOT, caller.getFileName()).replace(/\\/g, "/");
}

/** @returns {{ channel: string, file: string }[]} 依註冊順序 */
function collectRegisteredHandlers() {
  const { registerAllMainIpc } = require("../../main/ipc");
  const handlers = [];
  const ipcMain = {
    handle(channel) {
      handlers.push({ channel, file: handleCallerFile() });
    },
  };
  registerAllMainIpc({ ipcMain, deps: {} });
  return handlers;
}

/**
 * @param {readonly string[]} allowed 畫面允許呼叫的 channel（lib/ipc-channels.js 的 ALLOWED_INVOKE）
 * @param {{ channel: string }[]} handlers
 * @returns {{ missing: string[], extra: string[], duplicated: string[] }}
 *   missing＝允許呼叫但沒人註冊；extra＝有註冊但畫面不准呼叫；duplicated＝同一個 channel 註冊不只一次
 */
function compareWithAllowlist(allowed, handlers) {
  const counts = new Map();
  for (const { channel } of handlers)
    counts.set(channel, (counts.get(channel) || 0) + 1);
  const allowedSet = new Set(allowed);
  return {
    missing: allowed.filter((c) => !counts.has(c)),
    extra: [...counts.keys()].filter((c) => !allowedSet.has(c)),
    duplicated: [...counts].filter(([, n]) => n > 1).map(([c]) => c),
  };
}

module.exports = { collectRegisteredHandlers, compareWithAllowlist };
