const { IPC } = require("../../lib/ipc-channels");

function registerWindowIpc({ ipcMain, deps }) {
  ipcMain.handle(IPC.invoke.WINDOW_MINIMIZE, () =>
    deps.getMainWindow?.()?.minimize?.(),
  );
  ipcMain.handle(IPC.invoke.WINDOW_CLOSE, () => deps.getMainWindow?.()?.close?.());
}

module.exports = { registerWindowIpc };

