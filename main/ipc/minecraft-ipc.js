const { IPC } = require("../../lib/ipc-channels");

function registerMinecraftIpc(ctx) {
  const { ipcMain, deps, showInfoDialog } = ctx || {};
  async function requireUpToDateInstanceOrThrow(settings) {
    const status = await deps.checkInstanceStatus(settings);
    if (status.launchBlocked) {
      const msg =
        typeof status.text === "string" && status.text.trim()
          ? status.text.trim()
          : "目前無法啟動（伺服器維護或啟動器版本不符等）。請稍後再試。";
      await showInfoDialog("無法啟動", msg);
      throw new Error(msg);
    }
    if (!status.needsInstall && !status.needsUpdate) return status;
    await showInfoDialog(
      "需要安裝/更新",
      "偵測到尚未安裝或有更新，請先點擊『安裝/更新』完成同步後再啟動。",
    );
    throw new Error("需要安裝/更新。");
  }

  ipcMain.handle(IPC.invoke.MINECRAFT_LAUNCH, async () => {
    const acct = await deps.readAccount();
    const settings = await deps.readSettings();
    const paths = deps.getPaths(settings);
    await requireUpToDateInstanceOrThrow(settings);
    await deps.ensureRuntimeAndLaunch({
      settings,
      paths,
      playerId: acct.loggedIn && acct.name ? acct.name : settings.playerId,
    });
  });

  ipcMain.handle(IPC.invoke.MINECRAFT_LAUNCH_OFFLINE, async () => {
    const settings = await deps.readSettings();
    const paths = deps.getPaths(settings);
    await requireUpToDateInstanceOrThrow(settings);
    await deps.ensureRuntimeAndLaunch({
      settings,
      paths,
      playerId: settings.playerId,
    });
  });

  ipcMain.handle(IPC.invoke.MINECRAFT_IS_RUNNING, async () =>
    deps.isMinecraftRunning(),
  );
}

module.exports = { registerMinecraftIpc };

