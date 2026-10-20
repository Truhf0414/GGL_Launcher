const { registerWindowIpc } = require("./window-ipc");
const { registerExternalIpc } = require("./external-ipc");
const { registerSettingsIpc } = require("./settings-ipc");
const { registerServerConfigIpc } = require("./server-config-ipc");
const { registerDialogIpc } = require("./dialog-ipc");
const { registerNotificationsIpc } = require("./notifications-ipc");
const { registerMinecraftIpc } = require("./minecraft-ipc");
const { registerInstanceIpc } = require("./instance-ipc");
const { registerDiagnosticsIpc } = require("./diagnostics-ipc");
const { registerLogIpc } = require("./log-ipc");

function registerAllMainIpc(ctx) {
  registerWindowIpc(ctx);
  registerExternalIpc(ctx);
  registerSettingsIpc(ctx);
  registerServerConfigIpc(ctx);
  registerDialogIpc(ctx);
  registerNotificationsIpc(ctx);
  registerMinecraftIpc(ctx);
  registerInstanceIpc(ctx);
  registerDiagnosticsIpc(ctx);
  registerLogIpc(ctx);
}

module.exports = { registerAllMainIpc };
