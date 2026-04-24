const { IPC } = require("../../lib/ipc-channels");

function registerInstanceIpc(ctx) {
  const { ipcMain, deps, sendSyncStatus, sendSyncDone } = ctx || {};
  ipcMain.handle(IPC.invoke.INSTANCE_INSTALL_OR_UPDATE, async () => {
    try {
      if (!deps.isManifestUrlConfigured()) {
        sendSyncStatus("尚未設定更新來源");
        return false;
      }
      const settings = await deps.readSettings();
      await deps.installOrUpdateInstance(settings);
      await deps.checkInstanceStatusAndNotify();
      return true;
    } catch (e) {
      const msg = String(e?.message ?? e);
      const code = e && typeof e === "object" ? String(e.code || "") : "";
      sendSyncStatus(
        msg.includes("尚未設定更新來源")
          ? "尚未設定更新來源"
          : code && code.startsWith("GGL_LAUNCHER_")
            ? msg
            : `安裝/更新失敗：${msg}`,
      );
      throw e;
    }
  });

  ipcMain.handle(IPC.invoke.INSTANCE_RECHECK, async () => {
    try {
      await deps.checkInstanceStatusAndNotify();
    } catch (e) {
      const msg = String(e?.message ?? e);
      sendSyncStatus(`版本檢查失敗：${msg}`);
      sendSyncDone("版本檢查失敗");
      throw e;
    }
  });
}

module.exports = { registerInstanceIpc };

