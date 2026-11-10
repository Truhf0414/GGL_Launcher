"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { registerServerConfigIpc } = require("../main/ipc/server-config-ipc.js");
const { IPC } = require("../lib/ipc-channels.js");
const serverConfig = require("../lib/server-config.js");
const { hostPlatform } = require("../lib/platform.js");

function makeFakeIpcMain() {
  const handlers = new Map();
  return {
    handle: (channel, fn) => handlers.set(channel, fn),
    invoke: (channel, ...args) => {
      const fn = handlers.get(channel);
      if (!fn) throw new Error(`未註冊 handler：${channel}`);
      return fn(...args);
    },
  };
}

test("serverConfig:getDefaults 回畫面要的四個值：兩個取自注入的 serverConfig，安裝位置的預設與路徑規則取自這台的平台資料", async () => {
  const ipcMain = makeFakeIpcMain();
  registerServerConfigIpc({ ipcMain, deps: { serverConfig } });
  const out = await ipcMain.invoke(IPC.invoke.SERVER_CONFIG_GET_DEFAULTS, {});
  assert.deepEqual(out, {
    launcherRootDir: hostPlatform().defaultLauncherRootDir,
    pathStyle: hostPlatform().pathStyle,
    discordInviteUrl: serverConfig.discord.inviteUrl,
    launcherDownloadUrl: serverConfig.launcherDownloadUrl,
  });
});
