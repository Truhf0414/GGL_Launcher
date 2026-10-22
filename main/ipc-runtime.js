// Main IPC runtime: registration wiring with a closure guard.
// Intentionally does NOT import Electron; all Electron deps are injected.
const { registerAccountIpcHandlers } = require("./microsoft-auth");
const { registerAllMainIpc } = require("./ipc");
const { plainErrorIpcMain } = require("../lib/ipc-plain-errors");

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

    // 所有 handler 丟的錯在這裡統一換成普通 Error（→ lib/ipc-plain-errors.js）
    const plainIpcMain = plainErrorIpcMain(ipcMain);

    registerAccountIpcHandlers(plainIpcMain);

    registerAllMainIpc({
      ipcMain: plainIpcMain,
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
