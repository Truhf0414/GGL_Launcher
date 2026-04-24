// Renderer ↔ Main：IPC handlers + 推播到視窗（sync / MC / instance / server）
const { ipcMain, shell, dialog } = require("electron");
const { registerAccountIpcHandlers } = require("./microsoft-auth");
const { IPC } = require("../lib/ipc-channels");
const { registerWindowIpc } = require("./ipc/window-ipc");
const { registerExternalIpc } = require("./ipc/external-ipc");
const { registerSettingsIpc } = require("./ipc/settings-ipc");
const { registerDialogIpc } = require("./ipc/dialog-ipc");
const { registerNotificationsIpc } = require("./ipc/notifications-ipc");
const { registerMinecraftIpc } = require("./ipc/minecraft-ipc");
const { registerInstanceIpc } = require("./ipc/instance-ipc");
const { registerDiagnosticsIpc } = require("./ipc/diagnostics-ipc");

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

  async function showInfoDialog(title, message) {
    const win = deps.getMainWindow?.();
    try {
      if (win && typeof win.isDestroyed === "function" && !win.isDestroyed()) {
        await dialog.showMessageBox(win, { type: "info", title, message });
      } else {
        await dialog.showMessageBox({ type: "info", title, message });
      }
    } catch {}
  }

  function requireUpToDateInstanceOrThrow(settings) {
    return deps.checkInstanceStatus(settings).then(async (status) => {
      if (status.launchBlocked) {
        const msg =
          typeof status.text === "string" && status.text.trim()
            ? status.text.trim()
            : "目前無法啟動（伺服器維護或啟動器版本不符等）。請稍後再試。";
        await showInfoDialog("無法啟動", msg);
        throw new Error(msg);
      }
      if (!status.needsInstall && !status.needsUpdate) return status;
      await showInfoDialog(
        "需要安裝/更新",
        "偵測到尚未安裝或有更新，請先點擊『安裝/更新』完成同步後再啟動。",
      );
      throw new Error("需要安裝/更新。");
    });
  }

  function setupMainIpc() {
    if (mainIpcRegistered) return;
    mainIpcRegistered = true;

    registerAccountIpcHandlers(ipcMain);

    registerWindowIpc({ ipcMain, deps });
    registerExternalIpc({ ipcMain, deps: { ...deps, shell } });
    registerSettingsIpc({ ipcMain, deps });
    registerDialogIpc({ ipcMain, deps: { ...deps, dialog } });
    registerNotificationsIpc({ ipcMain, deps });
    registerMinecraftIpc({ ipcMain, deps, showInfoDialog });
    registerInstanceIpc({ ipcMain, deps, sendSyncStatus, sendSyncDone });
    registerDiagnosticsIpc({ ipcMain, deps: { ...deps, shell } });
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
