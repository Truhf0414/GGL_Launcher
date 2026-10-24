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

  // 唯一的送出點。送畫面是通知：失敗只記常駐日誌、不往呼叫者丟——同步更新／修復、啟動、登入、
  // 狀態查詢的結果不受通知影響（owner Q3 2026-10-25）。webContents 已銷毀是時序（視窗關閉中），不記。
  // 回 true 只代表 send 沒有同步丟錯，不代表畫面收到了：序列化失敗、renderer 崩潰時 Electron 不丟錯
  // （→ _notes/plans/cross-review-2026-10-phase6b.md §送畫面的實際行為、D2）
  function deliver(webContents, channel, payload) {
    if (webContents.isDestroyed()) return false;
    try {
      webContents.send(channel, payload);
      return true;
    } catch (err) {
      deps.gglError("main", "renderer_send_failed", err, { channel });
      return false;
    }
  }

  // 先看視窗：已銷毀的視窗連 .webContents 都不能讀；視窗關閉時 webContents 比視窗先銷毀，交給 deliver 判
  function send(channel, payload) {
    const win = deps.getMainWindow();
    if (!win || win.isDestroyed()) return;
    deliver(win.webContents, channel, payload);
  }

  function sendState(channel, payload) {
    latest.set(channel, payload);
    send(channel, payload);
  }

  /** @returns {string[]} 重送時 send 沒有丟錯的 channel（不代表畫面已收到）；一筆失敗不影響其他筆 */
  function replayLatest(webContents) {
    const replayed = [];
    for (const channel of STATE_CHANNELS) {
      if (!latest.has(channel)) continue;
      if (deliver(webContents, channel, latest.get(channel))) {
        replayed.push(channel);
      }
    }
    return replayed;
  }

  function sendSyncStatus(text) {
    void deps.appendLauncherLog(`SYNC ${text}`);
    send(IPC.on.SYNC_STATUS, { text });
  }

  function sendSyncProgress(text, progress01) {
    // null＝維持上一個值（describeProgress 的 verify），不能變成 0
    const p =
      progress01 === null
        ? null
        : Math.max(0, Math.min(1, Number(progress01) || 0));
    deps.logSyncProgressThrottled(text, p);
    send(IPC.on.SYNC_PROGRESS, { text, progress01: p });
  }

  function sendSyncDone(text) {
    void deps.appendLauncherLog(`SYNC_DONE ${text}`);
    send(IPC.on.SYNC_DONE, { text });
  }

  function sendMcStatus(text) {
    void deps.appendLauncherLog(`MC ${text}`);
    send(IPC.on.MINECRAFT_STATUS, { text });
  }

  function sendMcRunning(isRunning) {
    send(IPC.on.MINECRAFT_RUNNING, { isRunning: Boolean(isRunning) });
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
    const summary = {
      kind: status.kind,
      localReady: status.localReady,
      localVersion: status.localVersion,
      remoteVersion: status.remoteVersion,
    };
    void deps.appendLauncherLog(`INSTANCE ${JSON.stringify(summary)}`);
    // 摘要只有 kind：內部錯誤的原因另寫一行，診斷報告才看得到
    if (status.kind === "internal-error") {
      void deps.appendLauncherLog(`INSTANCE_ERROR ${status.errorDetail}`);
    }
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
    sendMcRunning,
    sendInstanceStatus,
    sendNotice,
    sendServerStatus,
    sendWindowPower,
    replayLatest,
  };
}

module.exports = { createIpcBridgeSenders };
