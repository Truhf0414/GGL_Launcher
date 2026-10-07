const { IPC } = require("../../lib/ipc-channels");

function registerSettingsIpc(ctx) {
  const { ipcMain, deps } = ctx || {};
  ipcMain.handle(IPC.invoke.SETTINGS_GET, async () => {
    const raw = await deps.readSettingsRaw();
    const settings = deps.normalizeSettingsObject(raw);
    const userMemoryConfigured =
      deps.isExplicitNumberLike(raw?.minMemoryGb) ||
      deps.isExplicitNumberLike(raw?.maxMemoryGb);

    return {
      ...(settings && typeof settings === "object" ? settings : {}),
      systemMemoryGb: deps.getSystemMemoryGb(),
      settingsMeta: {
        userMemoryConfigured,
      },
    };
  });

  ipcMain.handle(IPC.invoke.SETTINGS_SET, async (_e, patch) => {
    // 同步／啟動拿著鎖時換根目錄，會讓進行中的那件事與之後的檢查看不同的資料夾。
    // 設定視窗每次儲存都帶 launcherRootDir，所以比的是正規化後有沒有真的變（合併方式同 writeSettings）。
    if (
      patch &&
      typeof patch === "object" &&
      Object.hasOwn(patch, "launcherRootDir") &&
      deps.getLockHolder() !== null
    ) {
      const cur = await deps.readSettings();
      const nextRoot = deps.normalizeSettingsObject({
        ...cur,
        ...patch,
      }).launcherRootDir;
      if (nextRoot !== deps.normalizeSettingsObject(cur).launcherRootDir) {
        throw new Error("同步或啟動進行中，請稍後再改");
      }
    }
    return deps.writeSettings(patch);
  });
}

module.exports = { registerSettingsIpc };
