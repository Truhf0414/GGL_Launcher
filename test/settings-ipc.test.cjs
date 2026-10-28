"use strict";

// settings:get／settings:set：IPC 是安全邊界，main 用同一份契約驗（畫面驗過也不算數）。
// 接真的 main/settings.js 與暫存 userData，斷言看磁碟上的位元組。
// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V8（IPC 側）、V14（W7–W9）、V21；
//   K5 → _notes/plans/instance-sync-v3-commit4d.md；B7 → instance-sync-v3-commit3b2b.md

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const electron = require("./helpers/fake-electron.cjs").installFakeElectron();

const { registerSettingsIpc } = require("../main/ipc/settings-ipc.js");
const {
  DEFAULT_SETTINGS,
  SettingsError,
  readSettings,
  writeSettings,
} = require("../main/settings.js");
const { SETTINGS_KEYS } = require("../lib/settings-format.js");

const REFUSED = "同步或啟動進行中，請稍後再改";
const ON_DISK = {
  ...DEFAULT_SETTINGS,
  launcherRootDir: "D:\\GGL",
  maxMemoryGb: 8,
};

async function setup(t, { lockHolder = null, fileBytes } = {}) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-settings-ipc-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  electron.paths.userData = dir;
  const file = path.join(dir, "settings.json");
  const bytes = fileBytes ?? Buffer.from(JSON.stringify(ON_DISK, null, 2));
  await fsp.writeFile(file, bytes);
  const handlers = new Map();
  registerSettingsIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps: {
      readSettings,
      writeSettings,
      getLockHolder: () => lockHolder,
      getSystemMemoryGb: () => 16,
    },
  });
  return {
    file,
    bytes,
    get: () => handlers.get("settings:get")({ sender: {} }),
    set: (patch) => handlers.get("settings:set")({ sender: {} }, patch),
    onDisk: async () => JSON.parse(await fsp.readFile(file, "utf8")),
    unchanged: async () =>
      assert.ok((await fsp.readFile(file)).equals(bytes), "檔案被寫了"),
  };
}

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

// ── settings:get ──

test("settings:get 回驗過、補過預設的設定＋systemMemoryGb；沒有 settingsMeta、沒有 memoryGb", async (t) => {
  const h = await setup(t, { fileBytes: Buffer.from('{"maxMemoryGb":8}') });
  const got = await h.get();
  assert.deepEqual(got, {
    ...DEFAULT_SETTINGS,
    maxMemoryGb: 8,
    systemMemoryGb: 16,
  });
  assert.deepEqual(
    Object.keys(got).sort(),
    [...SETTINGS_KEYS, "systemMemoryGb"].sort(),
  );
});

test("V21 settings:get 遇壞檔、不合法的檔、檔不見 ⇒ reject SettingsError，不回半套設定", async (t) => {
  for (const [bytes, reason] of [
    [Buffer.from("{"), "invalid"],
    [Buffer.from('{"memoryGb":4}'), "invalid"],
  ]) {
    const h = await setup(t, { fileBytes: bytes });
    await rejectsWith(h.get(), (e) => {
      assert.ok(e instanceof SettingsError);
      assert.equal(e.reason, reason);
    });
    await h.unchanged();
  }
  const h = await setup(t);
  await fsp.rm(h.file);
  await rejectsWith(h.get(), (e) => assert.equal(e.reason, "missing"));
});

// ── settings:set：形狀與鍵（K5）──

test("K5 settings:set 擋下不是物件的 patch 與不認得的鍵（含 memoryGb），一個字都不寫", async (t) => {
  for (const [patch, got] of [
    [null, "null"],
    [undefined, "undefined"],
    [[], "array"],
    ["abc", "string"],
  ]) {
    const h = await setup(t);
    await rejectsWith(h.set(patch), (e) => {
      assert.ok(
        e.message.includes(`設定內容格式錯誤（收到 ${got}）`),
        e.message,
      );
    });
    await h.unchanged();
  }
  for (const patch of [
    { someFutureKey: 1, playerId: "Steve" },
    { playerId: "Steve", someFutureKey: 1, minMemoryGb: 4 },
    { playerId: "Steve", memoryGb: 4 },
  ]) {
    const h = await setup(t);
    const unknown = Object.keys(patch).find((k) => !SETTINGS_KEYS.includes(k));
    await rejectsWith(h.set(patch), (e) => {
      assert.ok(e.message.includes(unknown), e.message);
    });
    await h.unchanged();
  }
});

test("K5 設定視窗實際送的四個鍵照常寫入；檔裡是合併後的完整物件、回傳它", async (t) => {
  const h = await setup(t);
  const patch = {
    launcherRootDir: "E:\\Game2\\GGL",
    playerId: "Steve",
    minMemoryGb: 2,
    maxMemoryGb: null,
  };
  const next = await h.set(patch);
  assert.deepEqual(next, { ...ON_DISK, ...patch });
  assert.deepEqual(await h.onDisk(), { ...ON_DISK, ...patch });
});

// ── V8 IPC 側：畫面擋過也要再擋 ──

test("V8 直接打 IPC 送非法值 ⇒ reject（訊息是同一份 formatIssue）、不寫", async (t) => {
  for (const patch of [
    { minMemoryGb: 0 },
    { maxMemoryGb: 65 },
    { maxMemoryGb: "8" },
    { minMemoryGb: 8, maxMemoryGb: 4 },
    { playerId: "" },
    { playerId: " Steve" },
    { launcherRootDir: "C:" },
    { launcherRootDir: "  D:\\GGL  " },
    { debugLogging: "true" },
  ]) {
    const h = await setup(t);
    await rejectsWith(h.set(patch), (e) => {
      assert.ok(!(e instanceof SettingsError), "檔案沒壞");
      assert.ok(e.message.includes(Object.keys(patch)[0]), e.message);
    });
    await h.unchanged();
  }
});

test("V8 合併後才非法（檔 max=8＋patch min=16）⇒ reject、不寫", async (t) => {
  const h = await setup(t);
  await rejectsWith(h.set({ minMemoryGb: 16 }), (e) => {
    assert.ok(e.message.includes("minMemoryGb"), e.message);
  });
  await h.unchanged();
});

test("settings:set 遇壞檔 ⇒ reject SettingsError、不覆寫", async (t) => {
  const h = await setup(t, { fileBytes: Buffer.from("{") });
  await rejectsWith(h.set({ playerId: "Steve" }), (e) => {
    assert.ok(e instanceof SettingsError);
  });
  await h.unchanged();
});

// ── V14 持鎖不可換根目錄（W7–W9 改寫）──

test("W7 持鎖時換根目錄 ⇒ 拒絕、不寫", async (t) => {
  for (const holder of ["update", "repair", "launch"]) {
    const h = await setup(t, { lockHolder: holder });
    await rejectsWith(h.set({ launcherRootDir: "E:\\Other" }), (e) => {
      assert.equal(e.constructor, Error);
      assert.equal(e.message, REFUSED);
    });
    await h.unchanged();
  }
});

test("W8 持鎖時根目錄字串不變 ⇒ 照寫；前後帶空白不再算「一樣」，而是不合法", async (t) => {
  {
    const h = await setup(t, { lockHolder: "update" });
    await h.set({ launcherRootDir: "D:\\GGL", playerId: "Steve" });
    assert.equal((await h.onDisk()).playerId, "Steve");
  }
  {
    const h = await setup(t, { lockHolder: "update" });
    await rejectsWith(h.set({ launcherRootDir: "  D:\\GGL  " }), (e) => {
      assert.notEqual(e.message, REFUSED);
      assert.ok(e.message.includes("launcherRootDir"), e.message);
    });
    await h.unchanged();
  }
});

test("W9 patch 沒帶根目錄、或沒人拿鎖 ⇒ 照寫", async (t) => {
  {
    const h = await setup(t, { lockHolder: "launch" });
    await h.set({ maxMemoryGb: 6 });
    assert.equal((await h.onDisk()).maxMemoryGb, 6);
  }
  {
    const h = await setup(t);
    await h.set({ launcherRootDir: "E:\\Other" });
    assert.equal((await h.onDisk()).launcherRootDir, "E:\\Other");
  }
});
