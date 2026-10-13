const { IPC } = require("../../lib/ipc-channels");

function registerExternalIpc(ctx) {
  const { ipcMain } = ctx || {};
  const shell = ctx?.shell;
  ipcMain.handle(IPC.invoke.OPEN_EXTERNAL, (_e, url) => {
    const u = String(url || "").trim();
    if (!/^https?:\/\//i.test(u)) return;
    try {
      return shell.openExternal(u);
    } catch {
      /* 無效 URL 等 */
    }
  });
}

module.exports = { registerExternalIpc };
