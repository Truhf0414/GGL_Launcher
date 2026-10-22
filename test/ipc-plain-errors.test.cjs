"use strict";

// 跨 IPC 的錯誤一律是普通 Error（instance-sync-v3 B14）：Electron 把 `<name>: <message>` 原樣交給畫面，
// 自訂類別的名稱（SettingsError…）會黏在玩家看到的訊息上。統一在 createIpcRuntime 拿到 ipcMain 時包一次。

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const electron = require("./helpers/fake-electron.cjs").installFakeElectron();

const { plainErrorIpcMain } = require("../lib/ipc-plain-errors.js");
const { createIpcRuntime } = require("../main/ipc-runtime.js");
const { SettingsError, readSettings, writeSettings } = require("../main/settings.js");

function makeFakeIpcMain() {
  const handlers = new Map();
  const removed = [];
  return {
    handlers,
    removed,
    handle: (channel, fn) => handlers.set(channel, fn),
    removeHandler: (channel) => removed.push(channel),
    invoke: (channel, ...args) => handlers.get(channel)({ sender: {} }, ...args),
  };
}

async function rejectsWith(promise) {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  assert.fail("應該要 reject");
}

class FooError extends Error {
  constructor(message) {
    super(message);
    this.name = "FooError";
    this.code = "FOO";
  }
}

test("自訂類別的錯誤 ⇒ 換成訊息相同的普通 Error，原錯放 cause", async () => {
  const fake = makeFakeIpcMain();
  const original = new FooError("第一行\n第二行");
  plainErrorIpcMain(fake).handle("x:y", async () => {
    throw original;
  });
  const err = await rejectsWith(fake.invoke("x:y"));
  assert.equal(err.constructor, Error);
  assert.equal(err.name, "Error");
  assert.equal(err.message, "第一行\n第二行");
  assert.equal(err.cause, original);
  assert.equal(String(err), "Error: 第一行\n第二行", "Electron 交給畫面的就是這一串");
});

test("同步丟的、TypeError、不是 Error 的值 ⇒ 都換成普通 Error", async () => {
  const fake = makeFakeIpcMain();
  const ipc = plainErrorIpcMain(fake);
  ipc.handle("a", () => {
    throw new TypeError("壞了");
  });
  ipc.handle("b", () => {
    throw "字串";
  });
  const a = await rejectsWith(fake.invoke("a"));
  assert.equal(a.constructor, Error);
  assert.equal(a.message, "壞了");
  const b = await rejectsWith(fake.invoke("b"));
  assert.equal(b.constructor, Error);
  assert.equal(b.message, "字串");
  assert.equal(b.cause, "字串");
});

test("已經是普通 Error ⇒ 原物件放行（instance-ipc 加的前綴與 cause 不被再包一層）", async () => {
  const fake = makeFakeIpcMain();
  const plain = new Error("更新失敗：x", { cause: new FooError("x") });
  plainErrorIpcMain(fake).handle("i:u", async () => {
    throw plain;
  });
  assert.equal(await rejectsWith(fake.invoke("i:u")), plain);
});

test("成功時回傳值與參數照樣傳遞；removeHandler 照樣轉給 ipcMain", async () => {
  const fake = makeFakeIpcMain();
  const ipc = plainErrorIpcMain(fake);
  ipc.handle("s:get", async (event, a, b) => ({ sender: event.sender, sum: a + b }));
  assert.deepEqual(await fake.invoke("s:get", 1, 2), { sender: {}, sum: 3 });
  ipc.removeHandler("s:get");
  assert.deepEqual(fake.removed, ["s:get"]);
});

// ── 正式接線：createIpcRuntime 拿到的 ipcMain 一律包過 ──

async function setupRuntime(t, deps) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-ipc-plain-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  electron.paths.userData = dir;
  const fake = makeFakeIpcMain();
  createIpcRuntime({
    ipcMain: fake,
    shell: { openPath: async () => "" },
    dialog: {},
    deps: { getLockHolder: () => null, getSystemMemoryGb: () => 16, readSettings, writeSettings, ...deps },
    showInfoDialog: async () => {},
    sendSyncStatus: () => {},
    sendSyncDone: () => {},
    replayLatest: () => {},
  }).setupOnce();
  return { dir, fake };
}

test("createIpcRuntime：每一條 channel 都經過包裝層註冊（含 registerAllMainIpc 之外的帳號那幾支）", () => {
  const { ALLOWED_INVOKE } = require("../lib/ipc-channels.js");
  const wrapper = path.resolve(__dirname, "..", "lib", "ipc-plain-errors.js");
  const viaWrapper = new Map();
  const ipcMain = {
    handle(channel) {
      viaWrapper.set(channel, new Error().stack.includes(wrapper));
    },
    removeHandler() {},
  };
  createIpcRuntime({ ipcMain, deps: {} }).setupOnce();
  assert.ok(viaWrapper.size > 0 && viaWrapper.size === ALLOWED_INVOKE.length, `註冊了 ${viaWrapper.size} 條`);
  assert.ok(viaWrapper.has("account:get"), "帳號那幾支要在裡面");
  assert.deepEqual([...viaWrapper].filter(([, ok]) => !ok).map(([c]) => c), []);
});

test("createIpcRuntime：settings:set 遇到 SettingsError ⇒ 畫面收到的是普通 Error、訊息不變", async (t) => {
  const { dir, fake } = await setupRuntime(t, {});
  await fsp.writeFile(path.join(dir, "settings.json"), '{"memoryGb": 4}');
  const err = await rejectsWith(fake.invoke("settings:set", { playerId: "Steve" }));
  assert.equal(err.constructor, Error, `實際 ${err.name}`);
  assert.ok(err.cause instanceof SettingsError);
  assert.equal(err.message, err.cause.message);
  assert.ok(!String(err).includes("SettingsError"), String(err));
});

test("createIpcRuntime：settings:get、diagnostics:export 遇到 SettingsError 也一樣", async (t) => {
  const { fake } = await setupRuntime(t, {
    exportDiagnostics: async () => {
      throw new SettingsError("missing", "C:\\x\\settings.json");
    },
  });
  // settings.json 不存在 ⇒ readSettings 丟 SettingsError(missing)
  for (const channel of ["settings:get", "diagnostics:export"]) {
    const err = await rejectsWith(fake.invoke(channel));
    assert.equal(err.constructor, Error, `${channel}：實際 ${err.name}`);
    assert.ok(err.cause instanceof SettingsError, channel);
  }
});
