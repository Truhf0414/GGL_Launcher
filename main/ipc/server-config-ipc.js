const { IPC } = require("../../lib/ipc-channels");

// 畫面要用的伺服器預設值；權威在 lib/server-config.js（經 deps.serverConfig 注入）
function registerServerConfigIpc(ctx) {
  const { ipcMain, deps } = ctx;
  ipcMain.handle(IPC.invoke.SERVER_CONFIG_GET_DEFAULTS, async () => ({
    launcherRootDir: deps.serverConfig.launcherRootDir,
    discordInviteUrl: deps.serverConfig.discord.inviteUrl,
    launcherDownloadUrl: deps.serverConfig.launcherDownloadUrl,
  }));
}

module.exports = { registerServerConfigIpc };
