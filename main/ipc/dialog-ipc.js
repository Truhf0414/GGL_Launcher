const { IPC } = require("../../lib/ipc-channels");
const { hostPlatform } = require("../../lib/platform.js");

function registerDialogIpc(ctx) {
  const { ipcMain, deps, dialog } = ctx;
  ipcMain.handle(
    IPC.invoke.DIALOG_SELECT_DIRECTORY,
    async (_e, defaultPath) => {
      const result = await dialog.showOpenDialog(
        deps.getMainWindow() ?? undefined,
        {
          title: "選擇安裝位置",
          defaultPath:
            typeof defaultPath === "string" && defaultPath
              ? defaultPath
              : hostPlatform().browseStartDir,
          properties: ["openDirectory", "createDirectory"],
        },
      );
      if (result.canceled) return "";
      return result.filePaths?.[0] || "";
    },
  );
}

module.exports = { registerDialogIpc };
