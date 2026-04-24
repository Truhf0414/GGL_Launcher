const { IPC } = require("../../lib/ipc-channels");

function registerDialogIpc({ ipcMain, deps }) {
  ipcMain.handle(IPC.invoke.DIALOG_SELECT_DIRECTORY, async (_e, defaultPath) => {
    const result = await deps.dialog.showOpenDialog(
      deps.getMainWindow?.() ?? undefined,
      {
        title: "選擇安裝位置",
        defaultPath:
          typeof defaultPath === "string" && defaultPath ? defaultPath : "C:\\",
        properties: ["openDirectory", "createDirectory"],
      },
    );
    if (result.canceled) return "";
    return result.filePaths?.[0] || "";
  });
}

module.exports = { registerDialogIpc };

