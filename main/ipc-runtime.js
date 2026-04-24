// Main IPC runtime: single-run guard + handler registration wiring.
const { ipcMain, shell, dialog } = require("electron");
const { registerAccountIpcHandlers } = require("./microsoft-auth");
const { registerAllMainIpc } = require("./ipc");
const { createShowInfoDialog } = require("./ui-dialogs");

/** Avoid double-registration of ipcMain handlers. */
let mainIpcRegistered = false;

function setupMainIpcRuntime({ deps, sendSyncStatus, sendSyncDone }) {
  if (mainIpcRegistered) return;
  mainIpcRegistered = true;

  registerAccountIpcHandlers(ipcMain);

  const showInfoDialog = createShowInfoDialog(deps.getMainWindow);

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

module.exports = { setupMainIpcRuntime };

