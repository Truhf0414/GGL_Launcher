const { plainErrorIpcMain } = require("../../lib/ipc-plain-errors");
const { registerAccountIpcHandlers } = require("../microsoft-auth");
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

/**
 * main 唯一的 IPC 註冊入口：正式啟動（start-main 交給 app-ready 的 setupMainIpc）、
 * scripts/lib/ipc-registry.js 與測試都呼叫這一個。
 * 只呼叫一次：再呼叫，Electron 會因同一個 channel 第二次 handle 而丟錯（不先 removeHandler）。
 * 本檔不 require electron：ipcMain、shell、dialog 由呼叫端放進 ctx。
 * @param {{ ipcMain, shell, dialog, deps, showInfoDialog, replayLatest }} ctx
 */
function registerAllMainIpc(ctx) {
  // 所有 handler 丟的錯在這裡統一換成普通 Error（→ lib/ipc-plain-errors.js）
  const plainCtx = { ...ctx, ipcMain: plainErrorIpcMain(ctx.ipcMain) };

  registerAccountIpcHandlers(plainCtx.ipcMain);
  registerWindowIpc(plainCtx);
  registerExternalIpc(plainCtx);
  registerSettingsIpc(plainCtx);
  registerServerConfigIpc(plainCtx);
  registerDialogIpc(plainCtx);
  registerNotificationsIpc(plainCtx);
  registerMinecraftIpc(plainCtx);
  registerInstanceIpc(plainCtx);
  registerDiagnosticsIpc(plainCtx);
  registerLogIpc(plainCtx);
}

module.exports = { registerAllMainIpc };
