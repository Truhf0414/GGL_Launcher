"use strict";

// configureMainWindow 的必填依賴（6b-3b，M-DI #5 → _notes/plans/cross-review-2026-10-phase6b.md §6b-3 細部初稿）：
// sendWindowPower、appRoot 是邊界內的值，漏接在開機時丟；圖示檔在不在是磁碟邊界，照舊退回 png。
// main-window 檔頂取 electron：載入前先換成假的（P3：只呼叫 configure 不碰 BrowserWindow）。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

require("./helpers/fake-electron.cjs").installFakeElectron();
const {
  configureMainWindow,
  getAppIconPath,
} = require("../main/main-window.js");

function makeAppRoot(t, { ico }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ggl-main-window-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  if (ico) {
    fs.mkdirSync(path.join(root, "assets"));
    fs.writeFileSync(path.join(root, "assets", "icon.ico"), "");
  }
  return root;
}

test("C3b 有 icon.ico ⇒ 圖示用 ico（對照列）", (t) => {
  const appRoot = makeAppRoot(t, { ico: true });
  configureMainWindow({ appRoot, sendWindowPower: () => {} });
  assert.equal(getAppIconPath(), path.join(appRoot, "assets", "icon.ico"));
});

test("C3b 沒有 icon.ico ⇒ 退回 icon.png（磁碟邊界，照舊）", (t) => {
  const appRoot = makeAppRoot(t, { ico: false });
  configureMainWindow({ appRoot, sendWindowPower: () => {} });
  assert.equal(getAppIconPath(), path.join(appRoot, "assets", "icon.png"));
});

const MISSING = [
  ["鍵不存在", (deps, key) => delete deps[key]],
  ["值為 undefined", (deps, key) => (deps[key] = undefined)],
];

for (const [shape, change] of [
  ...MISSING,
  ["不是函式", (deps) => (deps.sendWindowPower = "not a function")],
]) {
  test(`C3b 缺必填 sendWindowPower（${shape}）⇒ TypeError、訊息含鍵名`, (t) => {
    const deps = {
      appRoot: makeAppRoot(t, { ico: true }),
      sendWindowPower: () => {},
    };
    change(deps, "sendWindowPower");
    assert.throws(
      () => configureMainWindow(deps),
      (e) => e instanceof TypeError && e.message.includes("sendWindowPower"),
    );
  });
}

for (const [shape, change] of [
  ...MISSING,
  ["空字串", (deps) => (deps.appRoot = "")],
  ["不是字串", (deps) => (deps.appRoot = 42)],
]) {
  test(`C3b appRoot ${shape} ⇒ TypeError、訊息含鍵名（不再退回 main/ 的上一層）`, () => {
    const deps = { appRoot: "unused", sendWindowPower: () => {} };
    change(deps, "appRoot");
    assert.throws(
      () => configureMainWindow(deps),
      (e) => e instanceof TypeError && e.message.includes("appRoot"),
    );
  });
}
