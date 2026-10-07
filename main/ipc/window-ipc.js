const { IPC } = require("../../lib/ipc-channels");

function registerWindowIpc(ctx) {
  const { ipcMain, deps, replayLatest } = ctx || {};
  ipcMain.handle(IPC.invoke.WINDOW_MINIMIZE, () =>
    deps.getMainWindow?.()?.minimize?.(),
  );
  ipcMain.handle(IPC.invoke.WINDOW_CLOSE, () =>
    deps.getMainWindow?.()?.close?.(),
  );
  // 重送給喊 ready 的那個 webContents（重新整理後也是它），不是「主視窗」
  ipcMain.handle(IPC.invoke.RENDERER_READY, (event) => {
    const replayed = replayLatest(event.sender);
    void deps.appendLauncherLog(`REPLAY ${replayed.join(" ")}`);
  });
}

module.exports = { registerWindowIpc };
