"use strict";

// 真的 main/ipc-bridge.js senders，接一個活的假主視窗（isDestroyed 都回 false）。
// webContents.send 交給呼叫者給的 send；gglError 記下來給斷言。
// 送畫面失敗由 bridge 接住並記常駐日誌（Q3）→ _notes/plans/cross-review-2026-10-phase6b.md §6b-1 施工方案 D2

const { createIpcBridgeSenders } = require("../../main/ipc-bridge.js");

/** @param {(channel: string, payload: unknown) => void} send */
function bridgeWithLiveWindow(send) {
  const errors = [];
  const webContents = { isDestroyed: () => false, send };
  const bridge = createIpcBridgeSenders({
    getMainWindow: () => ({ isDestroyed: () => false, webContents }),
    appendLauncherLog: async () => {},
    logSyncProgressThrottled: () => {},
    gglError: (...args) => errors.push(args),
  });
  return { bridge, errors };
}

const throwOnSend = () => {
  throw new Error("boom");
};

module.exports = { bridgeWithLiveWindow, throwOnSend };
