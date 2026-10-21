"use strict";

// 設定檔在磁碟上的現行為（特徵測試）：檔不存在 ⇒ 建預設；合法且不缺鍵 ⇒ 開機不動它。
// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V1、V2（4a；4b 改契約時改寫）

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const Module = require("module");

// main/paths.js 用到時才 require("electron")；npm test 的 forbid-electron 會擋。
// 只在本檔把 electron 換成假的 app（userData 指到每案的暫存資料夾），其他 require 照舊交給 forbid-electron。
let userDataDir = null;
const fakeElectron = {
  app: {
    getPath: (name) => {
      assert.equal(name, "userData");
      return userDataDir;
    },
    isPackaged: false,
  },
};
const loadBefore = Module._load;
Module._load = function loadWithFakeElectron(request, ...rest) {
  if (request === "electron") return fakeElectron;
  return loadBefore.call(this, request, ...rest);
};

const {
  ensureSettingsFileInitialized,
  readSettings,
} = require("../main/settings.js");
const serverConfig = require("../lib/server-config.js");

async function useUserData(t, { create = true } = {}) {
  const base = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-settings-"));
  t.after(() => fsp.rm(base, { recursive: true, force: true }));
  userDataDir = create ? base : path.join(base, "not", "yet");
  return path.join(userDataDir, "settings.json");
}

// 現行 normalizeSettingsObject(預設檔) 的輸出（assets/default-settings.json 加上 launcherRootDir）
const CREATED_DEFAULTS = {
  memoryGb: 4,
  minMemoryGb: null,
  maxMemoryGb: null,
  playerId: "Player001",
  launcherRootDir: serverConfig.launcherRootDir,
  debugLogging: false,
};

test("V1 檔不存在 ⇒ 建出預設；之後讀得回同一份", async (t) => {
  const file = await useUserData(t);
  assert.equal(await ensureSettingsFileInitialized(), true);
  const raw = await fsp.readFile(file, "utf8");
  assert.deepEqual(JSON.parse(raw), CREATED_DEFAULTS);
  assert.deepEqual(await readSettings(), CREATED_DEFAULTS);
});

test("V1 userData 資料夾還不存在 ⇒ 連資料夾一起建出來", async (t) => {
  const file = await useUserData(t, { create: false });
  assert.equal(await ensureSettingsFileInitialized(), true);
  assert.deepEqual(JSON.parse(await fsp.readFile(file, "utf8")), CREATED_DEFAULTS);
});

test("V2（4a 版）合法且預設檔的鍵都在 ⇒ 開機後位元組不變", async (t) => {
  const file = await useUserData(t);
  // owner 現在那份的形狀（2026-10-21 現讀）；含 memoryGb——4b 之後它是不認得的鍵，本案必改寫
  const bytes = Buffer.from(
    JSON.stringify(
      {
        memoryGb: 4,
        minMemoryGb: 4,
        maxMemoryGb: 16,
        playerId: "Truhf0414",
        launcherRootDir: "E:\\Game2\\GGL",
        debugLogging: false,
      },
      null,
      2,
    ),
  );
  await fsp.writeFile(file, bytes);
  assert.equal(await ensureSettingsFileInitialized(), false);
  assert.ok((await fsp.readFile(file)).equals(bytes));
});
