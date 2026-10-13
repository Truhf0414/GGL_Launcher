// Single source of truth for IPC channel names.
// Used by main (ipcMain.handle), preload allowlists, and docs generation.

const IPC = Object.freeze({
  invoke: Object.freeze({
    WINDOW_MINIMIZE: "window:minimize",
    WINDOW_CLOSE: "window:close",
    // 畫面所有監聽都掛好之後呼叫一次；main 把狀態事件記住的最後一筆各重送一次給呼叫者
    RENDERER_READY: "renderer:ready",
    OPEN_EXTERNAL: "openExternal",

    DIAGNOSTICS_EXPORT: "diagnostics:export",

    SETTINGS_GET: "settings:get",
    SETTINGS_SET: "settings:set",

    // 伺服器預設值（lib/server-config.js）給畫面；不用 server: 前綴，那是 Minecraft 伺服器在線狀態
    SERVER_CONFIG_GET_DEFAULTS: "serverConfig:getDefaults",

    NOTIFICATIONS_GET: "notifications:get",
    NOTIFICATIONS_CLEAR: "notifications:clear",

    DIALOG_SELECT_DIRECTORY: "dialog:selectDirectory",

    // 實例同步（main/sync 的中樞）。錯誤一律是普通 Error，訊息可直接顯示。
    // recheck：() → void，結果只走 instance:status
    INSTANCE_RECHECK: "instance:recheck",
    // update：() → { movedAside: {from,to}[] }
    INSTANCE_UPDATE: "instance:update",
    // repair：({ strayJarsToRemove: string[] }) → { movedAside: {from,to}[] }
    INSTANCE_REPAIR: "instance:repair",
    // listStrayJars：() → string[]（mods/ 裡不在清單上的 jar）
    INSTANCE_LIST_STRAY_JARS: "instance:listStrayJars",

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
    MINECRAFT_RUNNING: "minecraft:running",

    RPC_NOTICE: "rpc:notice",
    INSTANCE_STATUS: "instance:status",
    // { notice, notifications }：公告卡片與鈴鐺都聽它
    NOTICE_CHANGED: "notice:changed",
  }),
});

function valuesOf(obj) {
  return Object.values(obj || {}).map((x) => String(x));
}

const ALLOWED_INVOKE = Object.freeze(valuesOf(IPC.invoke));
const ALLOWED_ON = Object.freeze(valuesOf(IPC.on));

module.exports = { IPC, ALLOWED_INVOKE, ALLOWED_ON };
