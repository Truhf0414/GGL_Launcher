const { IPC } = require("../lib/ipc-channels");
const { describeStatus } = require("../lib/sync/status-text.js");

// 狀態類事件講的是「現在的狀態」：送出時記住最後一筆（視窗不存在也記），
// 畫面喊 renderer:ready 時各重送一筆給它——送出當下畫面還沒在聽也不會漏。
// 規則 → _notes/conventions.md；裁決 → _notes/plans/instance-sync-v3-commit3b2b.md B10
const STATE_CHANNELS = Object.freeze([
  IPC.on.INSTANCE_STATUS,
  IPC.on.NOTICE_CHANGED,
  IPC.on.SERVER_STATUS,
  IPC.on.WINDOW_POWER,
]);

function createIpcBridgeSenders(deps) {
  const latest = new Map();

  function sendState(channel, payload) {
    latest.set(channel, payload);
    try {
      deps.getMainWindow?.()?.webContents?.send(channel, payload);
    } catch {}
  }

  /** @returns {string[]} 實際重送成功的 channel */
  function replayLatest(webContents) {
    const replayed = [];
    for (const channel of STATE_CHANNELS) {
      if (!latest.has(channel)) continue;
      try {
        webContents.send(channel, latest.get(channel));
        replayed.push(channel);
      } catch {}
    }
    return replayed;
  }

  function sendSyncStatus(text) {
    void deps.appendLauncherLog(`SYNC ${text}`);
    deps.getMainWindow?.()?.webContents?.send(IPC.on.SYNC_STATUS, { text });
  }

  function sendSyncProgress(text, progress01) {
    // null＝維持上一個值（describeProgress 的 verify），不能變成 0
    const p =
      progress01 === null
        ? null
        : Math.max(0, Math.min(1, Number(progress01) || 0));
    deps.logSyncProgressThrottled(text, p);
    deps.getMainWindow?.()?.webContents?.send(IPC.on.SYNC_PROGRESS, {
      text,
      progress01: p,
    });
  }

  function sendSyncDone(text) {
    void deps.appendLauncherLog(`SYNC_DONE ${text}`);
    deps.getMainWindow?.()?.webContents?.send(IPC.on.SYNC_DONE, { text });
  }

  function sendMcStatus(text) {
    void deps.appendLauncherLog(`MC ${text}`);
    deps
      .getMainWindow?.()
      ?.webContents?.send(IPC.on.MINECRAFT_STATUS, { text });
  }

  function sendMcProgress(text, progress01) {
    const p = Math.max(0, Math.min(1, Number(progress01) || 0));
    void deps.appendLauncherLog(`MC ${text} ${(p * 100).toFixed(1)}%`);
    deps.getMainWindow?.()?.webContents?.send(IPC.on.MINECRAFT_PROGRESS, {
      text,
      progress01: p,
    });
  }

  function sendMcRunning(isRunning) {
    deps.getMainWindow?.()?.webContents?.send(IPC.on.MINECRAFT_RUNNING, {
      isRunning: Boolean(isRunning),
    });
  }

  // describeStatus 丟錯＝bug（未知 kind／原因）；照樣送出，不然中樞吞錯、畫面停在上一筆
  function textOf(status) {
    try {
      return describeStatus(status);
    } catch (err) {
      void deps.appendLauncherLog(`INSTANCE_TEXT_ERROR ${err?.stack ?? err}`);
      return {
        headline: `啟動器內部錯誤，請回報（狀態：${status?.kind}）`,
        details: [],
      };
    }
  }

  function sendInstanceStatus(status) {
    try {
      const summary = {
        kind: status?.kind,
        localReady: status?.localReady,
        localVersion: status?.localVersion,
        remoteVersion: status?.remoteVersion,
      };
      void deps.appendLauncherLog(`INSTANCE ${JSON.stringify(summary)}`);
      // 摘要只有 kind：內部錯誤的原因另寫一行，診斷報告才看得到
      if (status?.kind === "internal-error") {
        void deps.appendLauncherLog(`INSTANCE_ERROR ${status.errorDetail}`);
      }
    } catch {}
    sendState(IPC.on.INSTANCE_STATUS, { ...status, text: textOf(status) });
  }

  function sendNotice(snapshot) {
    sendState(IPC.on.NOTICE_CHANGED, snapshot);
  }

  function sendServerStatus(state) {
    sendState(IPC.on.SERVER_STATUS, { state });
  }

  function sendWindowPower(minimized) {
    sendState(IPC.on.WINDOW_POWER, { minimized: Boolean(minimized) });
  }

  return {
    sendSyncStatus,
    sendSyncProgress,
    sendSyncDone,
    sendMcStatus,
    sendMcProgress,
    sendMcRunning,
    sendInstanceStatus,
    sendNotice,
    sendServerStatus,
    sendWindowPower,
    replayLatest,
  };
}

module.exports = { createIpcBridgeSenders };
