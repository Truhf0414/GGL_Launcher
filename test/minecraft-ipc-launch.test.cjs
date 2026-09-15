"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const accountStore = require("../main/account-store.js");
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

// ── 跨層：真 account-store＋暫存 account.json＋假 safeStorage ──────────────
// 解不開的 token 不得走到啟動、換新或寫檔；寫檔與否以檔案雜湊判定，不看 calls。

function makeFakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (s) => Buffer.from(`ENC:${s}`, "utf8"),
    decryptString: (buf) => {
      const s = buf.toString("utf8");
      if (!s.startsWith("ENC:")) throw new Error("解密失敗");
      return s.slice(4);
    },
  };
}

function encryptedEnvelope(plaintext) {
  return {
    version: 1,
    method: "safeStorage",
    data: Buffer.from(`ENC:${plaintext}`, "utf8").toString("base64"),
  };
}

const UNDECRYPTABLE_ENVELOPE = {
  version: 1,
  method: "safeStorage",
  data: Buffer.from("garbage").toString("base64"),
};

const EXPIRED = () => Date.now() - 1000;
const NOT_EXPIRED = () => Date.now() + 60 * 60 * 1000;

async function sha256OfFile(filePath) {
  return crypto
    .createHash("sha256")
    .update(await fsp.readFile(filePath))
    .digest("hex");
}

/** 把 diskOverrides 寫成 account.json，接上真 account-store 後註冊 IPC。 */
async function setupRealStoreIpc(t, diskOverrides, depsOverrides = {}) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-launch-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const filePath = path.join(root, "account.json");
  await fsp.writeFile(
    filePath,
    JSON.stringify({
      state: ACCOUNT_STATE.ACTIVE,
      name: "Steve",
      uuid: "uuid-1",
      avatarUrl: "",
      mcAccessToken: encryptedEnvelope("mc-secret"),
      msRefreshToken: encryptedEnvelope("refresh-secret"),
      expiresAt: NOT_EXPIRED(),
      ...diskOverrides,
    }),
    "utf8",
  );
  accountStore.configureAccountStore({
    safeStorage: makeFakeSafeStorage(),
    getAccountPath: () => filePath,
  });
  const hashBefore = await sha256OfFile(filePath);
  const { ipcMain, calls } = setupIpc({
    readAccount: accountStore.readAccount,
    writeAccount: async (acct) => {
      calls.write.push(acct);
      return accountStore.writeAccount(acct);
    },
    refreshMicrosoftAndMinecraftTokens: async () => {
      calls.refresh += 1;
      return { outcome: REFRESH_OUTCOME.RETRYABLE, detail: "不該被呼叫" };
    },
    ...depsOverrides,
  });
  return { ipcMain, calls, filePath, hashBefore };
}

async function assertBlockedWithoutSideEffects(setup) {
  const { ipcMain, calls, filePath, hashBefore } = setup;
  await assert.rejects(() => ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH));
  assert.equal(calls.launch.length, 0, "不得啟動");
  assert.equal(calls.refresh, 0, "不得呼叫換新");
  assert.equal(calls.write.length, 0, "不得呼叫 writeAccount");
  assert.equal(
    await sha256OfFile(filePath),
    hashBefore,
    "account.json 須逐位元組未變",
  );
}

test("跨層：mc token 解不開＋未過期 → 不啟動、不換新、不寫檔", async (t) => {
  await assertBlockedWithoutSideEffects(
    await setupRealStoreIpc(t, { mcAccessToken: UNDECRYPTABLE_ENVELOPE }),
  );
});

test("跨層：mc token 解不開＋已過期 → 不換新、不寫檔（不抹掉磁碟上的 credential）", async (t) => {
  await assertBlockedWithoutSideEffects(
    await setupRealStoreIpc(t, {
      mcAccessToken: UNDECRYPTABLE_ENVELOPE,
      expiresAt: EXPIRED(),
    }),
  );
});

test("跨層：active 但 mc token 為 null＋未過期 → 不啟動、不寫檔", async (t) => {
  await assertBlockedWithoutSideEffects(
    await setupRealStoreIpc(t, { mcAccessToken: null }),
  );
});

test("跨層：mc token envelope 的 data 為空字串 → 不啟動、不寫檔", async (t) => {
  await assertBlockedWithoutSideEffects(
    await setupRealStoreIpc(t, {
      mcAccessToken: { version: 1, method: "safeStorage", data: "" },
    }),
  );
});

for (const [label, diskOverrides] of [
  ["mc 解不開、refresh 可讀", { mcAccessToken: UNDECRYPTABLE_ENVELOPE }],
  ["mc 可讀、refresh 解不開", { msRefreshToken: UNDECRYPTABLE_ENVELOPE }],
]) {
  test(`跨層：${label} → reauth-required、不啟動、不換新、不寫檔`, async (t) => {
    const setup = await setupRealStoreIpc(t, {
      ...diskOverrides,
      expiresAt: EXPIRED(),
    });
    const payload = await accountStore.getAccountPayloadForRenderer();
    assert.equal(payload.state, ACCOUNT_STATE.REAUTH_REQUIRED);
    await assertBlockedWithoutSideEffects(setup);
  });
}

test("跨層：refresh token 為 null、mc token 可讀＋已過期＋換新回 invalid_grant → 寫檔後 mc token 仍是可解回原值的 envelope", async (t) => {
  const { ipcMain, calls, filePath } = await setupRealStoreIpc(
    t,
    { msRefreshToken: null, expiresAt: EXPIRED() },
    {
      refreshMicrosoftAndMinecraftTokens: async () => {
        calls.refresh += 1;
        return {
          outcome: REFRESH_OUTCOME.INVALID_GRANT,
          detail: "no refresh token",
        };
      },
    },
  );
  await assert.rejects(() => ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH));
  assert.equal(calls.refresh, 1);
  assert.equal(calls.launch.length, 0);
  const onDisk = JSON.parse(await fsp.readFile(filePath, "utf8"));
  assert.equal(onDisk.state, ACCOUNT_STATE.REAUTH_REQUIRED);
  assert.equal(onDisk.mcAccessToken.method, "safeStorage");
  assert.equal(
    Buffer.from(onDisk.mcAccessToken.data, "base64").toString("utf8"),
    "ENC:mc-secret",
  );
});
