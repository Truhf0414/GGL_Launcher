const { registerWindowIpc } = require("./window-ipc");
const { registerExternalIpc } = require("./external-ipc");
const { registerSettingsIpc } = require("./settings-ipc");
const { registerDialogIpc } = require("./dialog-ipc");
const { registerNotificationsIpc } = require("./notifications-ipc");
const { registerMinecraftIpc } = require("./minecraft-ipc");
const { registerInstanceIpc } = require("./instance-ipc");
const { registerDiagnosticsIpc } = require("./diagnostics-ipc");

function registerAllMainIpc({
  ipcMain,
  deps,
  showInfoDialog,
  sendSyncStatus,
  sendSyncDone,
  shell,
  dialog,
}) {
  registerWindowIpc({ ipcMain, deps });
  registerExternalIpc({ ipcMain, deps: { ...deps, shell } });
  registerSettingsIpc({ ipcMain, deps });
  registerDialogIpc({ ipcMain, deps: { ...deps, dialog } });
  registerNotificationsIpc({ ipcMain, deps });
  registerMinecraftIpc({ ipcMain, deps, showInfoDialog });
  registerInstanceIpc({ ipcMain, deps, sendSyncStatus, sendSyncDone });
  registerDiagnosticsIpc({ ipcMain, deps: { ...deps, shell } });
}

module.exports = { registerAllMainIpc };

