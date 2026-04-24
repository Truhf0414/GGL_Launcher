const { IPC } = require("../../lib/ipc-channels");

function registerDiagnosticsIpc({ ipcMain, deps }) {
  ipcMain.handle(IPC.invoke.DIAGNOSTICS_EXPORT, async () => {
    const dir = await deps.exportDiagnostics?.();
    const p = String(dir || "").trim();
    if (!p) throw new Error("無法匯出診斷報告。");
    try {
      await deps.shell.openPath(p);
    } catch {
      // ignore
    }
    return p;
  });
}

module.exports = { registerDiagnosticsIpc };

