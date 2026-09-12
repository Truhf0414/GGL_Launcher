"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { registerMinecraftIpc } = require("../main/ipc/minecraft-ipc.js");
const { IPC } = require("../lib/ipc-channels.js");
const { ACCOUNT_STATE, REFRESH_OUTCOME } = require("../lib/account-secret.js");

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

function baseAccount(overrides = {}) {
  return {
    state: ACCOUNT_STATE.ACTIVE,
    name: "Steve",
    uuid: "uuid-1",
    avatarUrl: "",
    mcAccessToken: "old-mc-token",
    msRefreshToken: "old-refresh",
    expiresAt: Date.now() + 60 * 60 * 1000, // 還早，不該觸發換新
    ...overrides,
  };
}

function setupIpc(depsOverrides = {}) {
  const calls = { refresh: 0, write: [], launch: [], dialogs: [] };
  const deps = {
    readSettings: async () => ({}),
    getPaths: () => ({}),
    checkInstanceStatus: async () => ({
      launchBlocked: false,
      needsInstall: false,
      needsUpdate: false,
    }),
    readAccount: async () => baseAccount(),
    writeAccount: async (acct) => {
      calls.write.push(acct);
    },
    refreshMicrosoftAndMinecraftTokens: async (acct) => {
      calls.refresh += 1;
      return { outcome: REFRESH_OUTCOME.SUCCESS, account: acct };
    },
    ensureRuntimeAndLaunch: async (args) => {
      calls.launch.push(args);
    },
    isMinecraftRunning: () => false,
    ...depsOverrides,
  };
  const ipcMain = makeFakeIpcMain();
  const showInfoDialog = async (title, message) => {
    calls.dialogs.push({ title, message });
  };
  registerMinecraftIpc({ ipcMain, deps, showInfoDialog });
  return { ipcMain, calls };
}

test("未過期：不呼叫換新（完全不打微軟），直接用現有 token 啟動", async () => {
  const { ipcMain, calls } = await setupIpc();
  await ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH);
  assert.equal(calls.refresh, 0);
  assert.equal(calls.write.length, 0);
  assert.equal(calls.launch.length, 1);
  assert.equal(calls.launch[0].auth.accessToken, "old-mc-token");
});

test("已過期：換新成功，傳給 launch 的是新 token，且只寫檔一次", async () => {
  const acct = baseAccount({ expiresAt: Date.now() - 1000 });
  const newAccount = {
    ...acct,
    mcAccessToken: "new-mc-token",
    msRefreshToken: "new-refresh",
    expiresAt: Date.now() + 3_600_000,
  };
  const { ipcMain, calls } = await setupIpc({
    readAccount: async () => acct,
    refreshMicrosoftAndMinecraftTokens: async () => ({
      outcome: REFRESH_OUTCOME.SUCCESS,
      account: newAccount,
    }),
  });
  await ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH);
  assert.equal(calls.write.length, 1);
  assert.equal(calls.write[0].mcAccessToken, "new-mc-token");
  assert.equal(calls.launch.length, 1);
  assert.equal(calls.launch[0].auth.accessToken, "new-mc-token");
});

test("換新遇 invalid_grant：轉 reauth-required、保留 credential、擋下啟動", async () => {
  const acct = baseAccount({ expiresAt: Date.now() - 1000 });
  const { ipcMain, calls } = await setupIpc({
    readAccount: async () => acct,
    refreshMicrosoftAndMinecraftTokens: async () => ({
      outcome: REFRESH_OUTCOME.INVALID_GRANT,
      detail: "invalid_grant",
    }),
  });
  await assert.rejects(() => ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH));
  assert.equal(calls.launch.length, 0);
  assert.equal(calls.write.length, 1);
  assert.equal(calls.write[0].state, ACCOUNT_STATE.REAUTH_REQUIRED);
  // credential 不刪——沿用原本的 token 值，只是狀態被標記
  assert.equal(calls.write[0].mcAccessToken, acct.mcAccessToken);
  assert.equal(calls.write[0].msRefreshToken, acct.msRefreshToken);
});

test("換新遇逾時／5xx（retryable）：帳號狀態不變、完全不寫檔，訊息不能講成要重新登入", async () => {
  const acct = baseAccount({ expiresAt: Date.now() - 1000 });
  const { ipcMain, calls } = await setupIpc({
    readAccount: async () => acct,
    refreshMicrosoftAndMinecraftTokens: async () => ({
      outcome: REFRESH_OUTCOME.RETRYABLE,
      detail: "HTTP 503",
    }),
  });
  await assert.rejects(() => ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH));
  assert.equal(calls.launch.length, 0);
  assert.equal(calls.write.length, 0); // 磁碟維持原狀，這是可重試的錯，不是帳號問題
  const shownText = calls.dialogs.map((d) => d.message).join(" ");
  assert.ok(!shownText.includes("重新登入"));
});

test("state 為 logged-out：直接擋下，不呼叫換新也不啟動", async () => {
  const { ipcMain, calls } = await setupIpc({
    readAccount: async () => baseAccount({ state: ACCOUNT_STATE.LOGGED_OUT }),
  });
  await assert.rejects(() => ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH));
  assert.equal(calls.refresh, 0);
  assert.equal(calls.launch.length, 0);
});

test("state 為 reauth-required：直接擋下，不呼叫換新也不啟動", async () => {
  const { ipcMain, calls } = await setupIpc({
    readAccount: async () =>
      baseAccount({ state: ACCOUNT_STATE.REAUTH_REQUIRED }),
  });
  await assert.rejects(() => ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH));
  assert.equal(calls.refresh, 0);
  assert.equal(calls.launch.length, 0);
});
