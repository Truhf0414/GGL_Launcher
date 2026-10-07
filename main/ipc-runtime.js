// Main IPC runtime: registration wiring with a closure guard.
// Intentionally does NOT import Electron; all Electron deps are injected.
const { registerAccountIpcHandlers } = require("./microsoft-auth");
const { registerAllMainIpc } = require("./ipc");

function createIpcRuntime({
  ipcMain,
  shell,
  dialog,
  deps,
  showInfoDialog,
  sendSyncStatus,
  sendSyncDone,
  replayLatest,
}) {
  let registered = false;

  function setupOnce() {
    if (registered) return;
    registered = true;

    registerAccountIpcHandlers(ipcMain);

    registerAllMainIpc({
      ipcMain,
      deps,
      showInfoDialog,
      sendSyncStatus,
      sendSyncDone,
      replayLatest,
      shell,
      dialog,
    });
  }

  return { setupOnce };
}

module.exports = { createIpcRuntime };
