// Renderer ↔ Main：IPC handlers + 推播到視窗（sync / MC / instance / server）
const { ipcMain, shell, dialog } = require("electron");
const { registerAccountIpcHandlers } = require("./microsoft-auth");
const { registerAllMainIpc } = require("./ipc");
const { createShowInfoDialog } = require("./ui-dialogs");
const { createIpcBridgeSenders } = require("./ipc-bridge");

/** 避免 `setupMainIpc` 被呼叫兩次時重複 `ipcMain.handle`（Electron 會丟錯） */
let mainIpcRegistered = false;

/** @param {Record<string, unknown>} deps 由 main.js 注入（getMainWindow、settings、manifest、launch 等） */
function createMainIpcBridge(deps) {
  const {
    sendSyncStatus,
    sendSyncProgress,
    sendSyncDone,
    sendMcStatus,
    sendMcProgress,
    sendMcRunning,
    sendInstanceStatus,
    sendServerStatus,
  } = createIpcBridgeSenders(deps);

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
