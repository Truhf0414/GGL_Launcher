// Renderer ↔ Main：IPC handlers + 推播到視窗（sync / MC / instance / server）
const { ipcMain, shell, dialog } = require("electron");
const { registerAccountIpcHandlers } = require("./microsoft-auth");
const { IPC } = require("../lib/ipc-channels");
const { registerAllMainIpc } = require("./ipc");
const { createShowInfoDialog } = require("./ui-dialogs");

/** 避免 `setupMainIpc` 被呼叫兩次時重複 `ipcMain.handle`（Electron 會丟錯） */
let mainIpcRegistered = false;

/** @param {Record<string, unknown>} deps 由 main.js 注入（getMainWindow、settings、manifest、launch 等） */
function createMainIpcBridge(deps) {
  function sendSyncStatus(text) {
    void deps.appendLauncherLog(`SYNC ${text}`);
    deps.getMainWindow?.()?.webContents?.send(IPC.on.SYNC_STATUS, { text });
  }
  function sendSyncProgress(text, progress01) {
    const p = Math.max(0, Math.min(1, Number(progress01) || 0));
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
    deps.getMainWindow?.()?.webContents?.send(IPC.on.MINECRAFT_STATUS, { text });
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
  function sendInstanceStatus(payload) {
    try {
      const summary = {
        state: payload?.state,
        localVersion: payload?.localVersion,
        remoteVersion: payload?.remoteVersion,
        needsInstall: payload?.needsInstall,
        needsUpdate: payload?.needsUpdate,
        noUpdateSource: payload?.noUpdateSource,
      };
      void deps.appendLauncherLog(`INSTANCE ${JSON.stringify(summary)}`);
    } catch {}
    deps.getMainWindow?.()?.webContents?.send(IPC.on.INSTANCE_STATUS, payload);
  }
  function sendServerStatus(state) {
    deps.getMainWindow?.()?.webContents?.send(IPC.on.SERVER_STATUS, { state });
  }

  const showInfoDialog = createShowInfoDialog(deps.getMainWindow);

  function setupMainIpc() {
    if (mainIpcRegistered) return;
    mainIpcRegistered = true;

    registerAccountIpcHandlers(ipcMain);

    registerAllMainIpc({
      ipcMain,
      deps,
      showInfoDialog,
      sendSyncStatus,
      sendSyncDone,
      shell,
      dialog,
    });
  }

  return {
    sendSyncStatus,
    sendSyncProgress,
    sendSyncDone,
    sendMcStatus,
    sendMcProgress,
    sendMcRunning,
    sendInstanceStatus,
    sendServerStatus,
    setupMainIpc,
  };
}

module.exports = { createMainIpcBridge };
