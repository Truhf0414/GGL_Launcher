// Renderer ↔ Main：IPC bridge + setup entrypoint
const { ipcMain, shell, dialog } = require("electron");
const { createIpcBridgeSenders } = require("./ipc-bridge");
const { createIpcRuntime } = require("./ipc-runtime");
const { createShowInfoDialog } = require("./ui-dialogs");

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
    sendNotice,
    sendServerStatus,
    sendWindowPower,
    replayLatest,
  } = createIpcBridgeSenders(deps);

  const showInfoDialog = createShowInfoDialog(deps.getMainWindow);
  const runtime = createIpcRuntime({
    ipcMain,
    shell,
    dialog,
    deps,
    showInfoDialog,
    sendSyncStatus,
    sendSyncDone,
    replayLatest,
  });

  function setupMainIpc() {
    runtime.setupOnce();
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
    setupMainIpc,
  };
}

module.exports = { createMainIpcBridge };
