const { IPC } = require("../../lib/ipc-channels");

function registerSettingsIpc({ ipcMain, deps }) {
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

  ipcMain.handle(IPC.invoke.SETTINGS_SET, async (_e, patch) =>
    deps.writeSettings(patch),
  );
}

module.exports = { registerSettingsIpc };

