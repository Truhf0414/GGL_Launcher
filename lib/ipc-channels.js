// Single source of truth for IPC channel names.
// Used by main (ipcMain.handle), preload allowlists, and docs generation.

const IPC = Object.freeze({
  invoke: Object.freeze({
    WINDOW_MINIMIZE: "window:minimize",
    WINDOW_CLOSE: "window:close",
    OPEN_EXTERNAL: "openExternal",

    DIAGNOSTICS_EXPORT: "diagnostics:export",

    SETTINGS_GET: "settings:get",
    SETTINGS_SET: "settings:set",

    // 伺服器預設值（lib/server-config.js）給畫面；不用 server: 前綴，那是 Minecraft 伺服器在線狀態
    SERVER_CONFIG_GET_DEFAULTS: "serverConfig:getDefaults",

    NOTIFICATIONS_GET: "notifications:get",
    NOTIFICATIONS_CLEAR: "notifications:clear",

    DIALOG_SELECT_DIRECTORY: "dialog:selectDirectory",

    INSTANCE_RECHECK: "instance:recheck",
    INSTANCE_INSTALL_OR_UPDATE: "instance:installOrUpdate",

    MINECRAFT_LAUNCH: "minecraft:launch",
    MINECRAFT_LAUNCH_OFFLINE: "minecraft:launchOffline",
    MINECRAFT_IS_RUNNING: "minecraft:isRunning",

    ACCOUNT_GET: "account:get",
    ACCOUNT_LOGIN: "account:login",
    ACCOUNT_LOGOUT: "account:logout",
  }),

  on: Object.freeze({
    SERVER_STATUS: "server:status",
    WINDOW_POWER: "window:power",

    SYNC_STATUS: "sync:status",
    SYNC_PROGRESS: "sync:progress",
    SYNC_DONE: "sync:done",

    MINECRAFT_STATUS: "minecraft:status",
    MINECRAFT_PROGRESS: "minecraft:progress",
    MINECRAFT_RUNNING: "minecraft:running",

    RPC_NOTICE: "rpc:notice",
    INSTANCE_STATUS: "instance:status",
    NOTIFICATIONS_CHANGED: "notifications:changed",
  }),
});

function valuesOf(obj) {
  return Object.values(obj || {}).map((x) => String(x));
}

const ALLOWED_INVOKE = Object.freeze(valuesOf(IPC.invoke));
const ALLOWED_ON = Object.freeze(valuesOf(IPC.on));

module.exports = { IPC, ALLOWED_INVOKE, ALLOWED_ON };

