const { IPC } = require("../../lib/ipc-channels");

function registerDiagnosticsIpc(ctx) {
  const { ipcMain, deps, shell } = ctx;
  ipcMain.handle(IPC.invoke.DIAGNOSTICS_EXPORT, async () => {
    const dir = await deps.exportDiagnostics();
    const p = String(dir || "").trim();
    if (!p) throw new Error("無法匯出診斷報告。");
    try {
      await shell.openPath(p);
    } catch {
      // 報告已經寫好，匯出就算成功；開不開得了資料夾是作業系統的事，畫面會顯示路徑讓玩家自己開
    }
    return p;
  });
}

module.exports = { registerDiagnosticsIpc };
