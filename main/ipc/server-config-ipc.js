const { IPC } = require("../../lib/ipc-channels");
const { hostPlatform } = require("../../lib/platform.js");

// 畫面要用的預設值：伺服器的權威在 lib/server-config.js（經 deps.serverConfig 注入）；
// 預設安裝位置與安裝位置的路徑規則依平台，權威在 lib/platform.js（畫面拿不到 process.platform）
function registerServerConfigIpc(ctx) {
  const { ipcMain, deps } = ctx;
  ipcMain.handle(IPC.invoke.SERVER_CONFIG_GET_DEFAULTS, async () => ({
    launcherRootDir: hostPlatform().defaultLauncherRootDir,
    pathStyle: hostPlatform().pathStyle,
    discordInviteUrl: deps.serverConfig.discord.inviteUrl,
    launcherDownloadUrl: deps.serverConfig.launcherDownloadUrl,
  }));
}

module.exports = { registerServerConfigIpc };
