// Main IPC runtime: registration wiring with a closure guard.
const { ipcMain, shell, dialog } = require("electron");
const { registerAccountIpcHandlers } = require("./microsoft-auth");
const { registerAllMainIpc } = require("./ipc");
const { createShowInfoDialog } = require("./ui-dialogs");

function createIpcRuntime({ deps, sendSyncStatus, sendSyncDone }) {
  let registered = false;

  function setupOnce() {
    if (registered) return;
    registered = true;

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

  return { setupOnce };
}

module.exports = { createIpcRuntime };

