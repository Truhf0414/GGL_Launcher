"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const accountStore = require("../main/account-store.js");
const { registerMinecraftIpc } = require("../main/ipc/minecraft-ipc.js");
const { plainErrorIpcMain } = require("../lib/ipc-plain-errors.js");
const { IPC } = require("../lib/ipc-channels.js");
const { ACCOUNT_STATE, REFRESH_OUTCOME } = require("../lib/account-secret.js");
const {
  makeFakeSafeStorage,
  encryptedEnvelope,
  UNDECRYPTABLE_ENVELOPE,
  TEMPORARILY_UNAVAILABLE_ENVELOPE,
} = require("./helpers/fake-safe-storage.cjs");
const { createInstanceSync, SyncStateError } = require("../main/sync/index.js");
const { writeRecord } = require("../main/sync/instance-record.js");
const { getPaths } = require("../lib/paths-layout.js");
const { registerSettingsIpc } = require("../main/ipc/settings-ipc.js");
const { DEFAULT_SETTINGS } = require("../main/settings.js");
const { RUNTIME, LAUNCH_ID, installRuntime } = require("./helpers/installed-runtime.cjs");
const { LaunchError } = require("../main/minecraft-launch.js");

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
  const calls = { refresh: 0, write: [], launch: [], dialogs: [], lock: 0 };
  const deps = {
    // ④c：閘把那次讀到的 settings／paths／record 交給 fn（A1）
    withLaunchLock: async (fn) => {
      calls.lock += 1;
      return fn({ kind: "up-to-date" }, { settings: { playerId: "P" }, paths: {}, record: { ...RUNTIME } });
    },
    readAccount: async () => baseAccount(),
    writeAccount: async (acct) => {
      calls.write.push(acct);
    },
    refreshMicrosoftAndMinecraftTokens: async (acct) => {
      calls.refresh += 1;
      return { outcome: REFRESH_OUTCOME.SUCCESS, account: acct };
    },
    launchMinecraft: async (args) => {
      calls.launch.push(args);
    },
    isMinecraftRunning: () => false,
    ...depsOverrides,
  };
  const ipcMain = makeFakeIpcMain();
  const showInfoDialog = async (title, message) => {
    calls.dialogs.push({ title, message });
  };
  // 跟正式接線一樣：錯誤換成普通 Error 由 registerAllMainIpc 包的這一層做
  registerMinecraftIpc({ ipcMain: plainErrorIpcMain(ipcMain), deps, showInfoDialog });
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
  const fakeSafeStorage = makeFakeSafeStorage();
  accountStore.configureAccountStore({
    getSafeStorage: () => fakeSafeStorage,
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
  [
    "mc 解不開、refresh 暫時不可用",
    {
      mcAccessToken: UNDECRYPTABLE_ENVELOPE,
      msRefreshToken: TEMPORARILY_UNAVAILABLE_ENVELOPE,
    },
  ],
  [
    "mc 暫時不可用、refresh 解不開",
    {
      mcAccessToken: TEMPORARILY_UNAVAILABLE_ENVELOPE,
      msRefreshToken: UNDECRYPTABLE_ENVELOPE,
    },
  ],
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

for (const [label, diskOverrides] of [
  ["mc token", { mcAccessToken: TEMPORARILY_UNAVAILABLE_ENVELOPE }],
  ["refresh token", { msRefreshToken: TEMPORARILY_UNAVAILABLE_ENVELOPE }],
]) {
  test(`跨層：${label} 暫時不可用＋已過期 → 顯示稍後再試、不啟動、不換新、不寫檔`, async (t) => {
    const setup = await setupRealStoreIpc(t, {
      ...diskOverrides,
      expiresAt: EXPIRED(),
    });
    const payload = await accountStore.getAccountPayloadForRenderer();
    assert.equal(payload.state, ACCOUNT_STATE.ACTIVE); // 畫面顯示存檔裡的狀態
    await assertBlockedWithoutSideEffects(setup);
    const shownText = setup.calls.dialogs.map((d) => d.message).join(" ");
    assert.ok(shownText.includes("稍後再試"), shownText);
    assert.ok(!shownText.includes("重新登入"), shownText);
  });
}

test("readAccount 丟非暫時不可用的錯誤 → 原錯誤照舊往外丟、不顯示稍後再試", async () => {
  const boom = new Error("讀帳號時的其他錯誤");
  const { ipcMain, calls } = setupIpc({
    readAccount: async () => {
      throw boom;
    },
  });
  await assert.rejects(() => ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH), boom);
  assert.equal(calls.dialogs.length, 0);
  assert.equal(calls.launch.length, 0);
});

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

// ── 啟動閘（③b-2b）：plan → _notes/plans/instance-sync-v3-commit3b2b.md §測試 W15–W18 ──

const LAUNCH_HANDLERS = [
  IPC.invoke.MINECRAFT_LAUNCH,
  IPC.invoke.MINECRAFT_LAUNCH_OFFLINE,
];

async function rejectsWith(promise, check) {
  let caught;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, "應該要 reject");
  check(caught);
}

test("W15 gate blocks launching ⇒ 無法啟動 dialog with the status text, no launch, plain Error", async () => {
  const blocked = {
    kind: "offline",
    localReady: false,
    ui: {
      button: { action: "retry", label: "重試", note: null },
      canLaunch: false,
    },
    allowed: { update: false, repair: false },
    syncReasons: ["interrupted"],
    errorTexts: ["manifest.json：連線逾時"],
    errorDetail: null,
    gateMessages: [],
    localVersion: "1.0",
    remoteVersion: "",
  };
  for (const channel of LAUNCH_HANDLERS) {
    const original = new SyncStateError(
      "GGL_SYNC_LAUNCH_BLOCKED",
      "目前無法啟動（狀態：offline）。",
      { status: blocked },
    );
    const { ipcMain, calls } = setupIpc({
      withLaunchLock: async () => {
        throw original;
      },
    });
    await rejectsWith(ipcMain.invoke(channel), (e) => {
      assert.equal(e.constructor, Error, channel);
      assert.equal(e.message, original.message, channel);
    });
    assert.deepEqual(
      calls.dialogs,
      [
        {
          title: "無法啟動",
          message:
            "連不上更新伺服器，而且本機還不能啟動（上次同步沒有完成），請連上網路後重試\n" +
            "manifest.json：連線逾時",
        },
      ],
      channel,
    );
    assert.equal(calls.launch.length, 0, channel);
  }
});

test("W16a GGL_SYNC_BUSY ⇒ no dialog, plain Error with the original message", async () => {
  for (const channel of LAUNCH_HANDLERS) {
    const original = new SyncStateError(
      "GGL_SYNC_BUSY",
      "更新或修復進行中，請等它完成。",
    );
    const { ipcMain, calls } = setupIpc({
      withLaunchLock: async () => {
        throw original;
      },
    });
    await rejectsWith(ipcMain.invoke(channel), (e) => {
      assert.equal(e.constructor, Error, channel);
      assert.equal(e.message, original.message, channel);
    });
    assert.deepEqual(calls.dialogs, [], channel);
  }
});

test("W16b logged-out ⇒ login dialog, launch lock never taken", async () => {
  const { ipcMain, calls } = setupIpc({
    readAccount: async () => baseAccount({ state: ACCOUNT_STATE.LOGGED_OUT }),
  });
  await assert.rejects(() => ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH));
  assert.deepEqual(calls.dialogs, [
    { title: "需要登入", message: "正版啟動需要先登入 Microsoft 帳號。" },
  ]);
  assert.equal(calls.lock, 0);
});

test("W16c readAccount fails with a non-temporary error ⇒ rejects, launch lock never taken", async () => {
  const { ipcMain, calls } = setupIpc({
    readAccount: async () => {
      throw new Error("讀帳號時的其他錯誤");
    },
  });
  await rejectsWith(ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH), (e) => {
    assert.equal(e.message, "讀帳號時的其他錯誤");
  });
  assert.equal(calls.lock, 0);
});

test("W16d expired token and refresh RETRYABLE ⇒ dialog, launch lock never taken", async () => {
  const { ipcMain, calls } = setupIpc({
    readAccount: async () => baseAccount({ expiresAt: Date.now() - 1000 }),
    refreshMicrosoftAndMinecraftTokens: async () => ({
      outcome: REFRESH_OUTCOME.RETRYABLE,
      detail: "HTTP 503",
    }),
  });
  await assert.rejects(() => ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH));
  assert.equal(calls.dialogs.length, 1);
  assert.equal(calls.lock, 0);
});

test("W16e game already running ⇒ both handlers refuse inside the lock; not running ⇒ launches", async () => {
  for (const channel of LAUNCH_HANDLERS) {
    const { ipcMain, calls } = setupIpc({ isMinecraftRunning: () => true });
    await rejectsWith(ipcMain.invoke(channel), (e) => {
      assert.equal(e.constructor, Error, channel);
      assert.equal(e.message, "遊戲已在執行中", channel);
    });
    assert.equal(calls.launch.length, 0, channel);
  }
  for (const channel of LAUNCH_HANDLERS) {
    const { ipcMain, calls } = setupIpc({ isMinecraftRunning: () => false });
    await ipcMain.invoke(channel);
    assert.equal(calls.launch.length, 1, channel);
  }
});

// 接真的中樞：假站台只回物件（中樞的狀態只看記錄、標記、Java 與三支 json，不比對檔案）
const HUB_RELEASE = {
  version: "1.0",
  publishedAt: "2026-10-06T00:00:00.000Z",
  minecraft: "1.21.11",
  loader: { type: "fabric", version: "0.19.3" },
  playerEditable: [],
  files: [{ path: "mods/a.jar", sha256: "a".repeat(64), size: 1 }],
};

async function setupRealHub(t, ipcDepsOverrides = {}) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-launch-hub-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const settings = { ...DEFAULT_SETTINGS, launcherRootDir: root };
  const paths = getPaths(settings);
  await writeRecord(paths, {
    format: 3,
    version: HUB_RELEASE.version,
    appliedAt: "2026-10-01T00:00:00.000Z",
    files: HUB_RELEASE.files.map((f) => ({ path: f.path, sha256: f.sha256 })),
    ...RUNTIME,
  }, { log: () => {} });
  await installRuntime(paths);
  const site = { online: true };
  const sync = createInstanceSync({
    readSettings: async () => settings,
    isMinecraftRunning: () => false,
    log: () => {},
    sendInstanceStatus: () => {},
    confirmGameClosed: async () => false,
    launcherVersion: "1.0.0",
    serverConfig: {
      manifestUrl: "https://ggl.test/manifest.json",
      protectedPaths: [],
    },
    siteClient: {
      fetchIndex: async () =>
        site.online
          ? { side: "ok", value: { format: 3 } }
          : { side: "unreachable", reason: "network", detail: "連不上" },
      fetchSite: async () => ({
        gate: { side: "ok", value: {} },
        release: { side: "ok", value: HUB_RELEASE },
      }),
    },
  });
  const ipc = setupIpc({
    withLaunchLock: sync.withLaunchLock,
    ...ipcDepsOverrides,
  });
  return { sync, site, settings, paths, ...ipc };
}

async function assertLockReleased(sync) {
  assert.equal(sync.getLockHolder(), null);
  let code = null;
  try {
    await sync.updateInstance();
  } catch (e) {
    code = e?.code;
  }
  assert.notEqual(code, "GGL_SYNC_BUSY");
}

test("W17 real hub: launch failure and gate refusal both release the lock", async (t) => {
  // (甲) 閘放行、啟動本身丟錯
  {
    let launches = 0;
    const h = await setupRealHub(t, {
      launchMinecraft: async () => {
        launches++;
        throw new Error("boom launch");
      },
    });
    assert.equal((await h.sync.getInstanceStatus()).kind, "up-to-date");
    await rejectsWith(
      h.ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH_OFFLINE),
      (e) => assert.equal(e.message, "boom launch"),
    );
    assert.equal(launches, 1);
    await assertLockReleased(h.sync);
  }
  // (乙) 離線＋沒有記錄 ⇒ 閘不放行
  {
    let launches = 0;
    const h = await setupRealHub(t, {
      launchMinecraft: async () => {
        launches++;
      },
    });
    h.site.online = false;
    await fsp.rm(h.paths.syncRecordPath);
    await rejectsWith(
      h.ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH_OFFLINE),
      (e) => assert.equal(e.message, "目前無法啟動（狀態：offline）。"),
    );
    assert.equal(launches, 0);
    await assertLockReleased(h.sync);
  }
});

test("W18 real hub: while launching the lock is held and changing the root dir is refused", async (t) => {
  let entered;
  const enteredP = new Promise((r) => (entered = r));
  let finishLaunch = () => {};
  t.after(() => finishLaunch());
  const h = await setupRealHub(t, {
    launchMinecraft: () => {
      entered();
      return new Promise((r) => (finishLaunch = r));
    },
  });
  const launching = h.ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH_OFFLINE);
  await enteredP;
  await new Promise((r) => setImmediate(r));
  assert.equal(h.sync.getLockHolder(), "launch");

  const handlers = new Map();
  let writes = 0;
  registerSettingsIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps: {
      readSettings: async () => h.settings,
      getLockHolder: h.sync.getLockHolder,
      writeSettings: async () => {
        writes++;
      },
    },
  });
  await rejectsWith(
    handlers.get(IPC.invoke.SETTINGS_SET)(
      { sender: {} },
      { launcherRootDir: path.join(h.settings.launcherRootDir, "other") },
    ),
    (e) => assert.equal(e.message, "同步或啟動進行中，請稍後再改"),
  );
  assert.equal(writes, 0);

  finishLaunch();
  await launching;
  assert.equal(h.sync.getLockHolder(), null);
});

// → _notes/plans/instance-sync-v3-commit4c.md §測試 C10、C14
test("C10 啟動丟 LaunchError ⇒ 找不到 Java 跳對應的框，其他 code 不跳；錯誤照丟（⑤c 起啟動不讀 json，沒有「找不到版本」）", async () => {
  const cases = [
    ["GGL_LAUNCH_NO_JAVA", "找不到 Java"],
    ["GGL_LAUNCH_NOT_READY", null],
    ["GGL_LAUNCH_SPAWN_FAILED", null],
  ];
  for (const [code, title] of cases) {
    const { ipcMain, calls } = await setupIpc({
      launchMinecraft: async () => {
        throw new LaunchError(code, `msg ${code}`);
      },
    });
    await rejectsWith(ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH_OFFLINE), (e) =>
      assert.equal(e.message, `msg ${code}`),
    );
    assert.deepEqual(calls.dialogs.map((d) => d.title), title ? [title] : [], code);
  }
});

test("C14 real hub：launchMinecraft 拿到閘那次的 settings／paths／record／成品（⑤c S5），離線帳號名取自那份 settings", async (t) => {
  let got;
  const h = await setupRealHub(t, {
    launchMinecraft: async (args) => {
      got = args;
    },
  });
  await h.ipcMain.invoke(IPC.invoke.MINECRAFT_LAUNCH_OFFLINE);
  assert.equal(got.settings, h.settings);
  assert.deepEqual(got.paths, h.paths);
  assert.deepEqual(
    { minecraft: got.record.minecraft, loader: got.record.loader, javaMajor: got.record.javaMajor },
    RUNTIME,
  );
  assert.equal(got.auth.name, h.settings.playerId);
  assert.equal(got.launch.merged.id, LAUNCH_ID);
});
