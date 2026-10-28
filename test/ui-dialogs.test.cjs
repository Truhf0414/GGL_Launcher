"use strict";

// showInfoDialog 只在主視窗活著時掛上去：與 game-closed-dialog 同一條規則
// （A11 → _notes/plans/instance-sync-v3-commit3b2a.md；6b-1 B10u → _notes/plans/cross-review-2026-10-phase6b.md D6）
// 跳框失敗不得蓋掉原本的結果，只記一筆（D-6E-DLG → _notes/plans/cross-review-2026-10-phase6e.md）

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const electron = require("./helpers/fake-electron.cjs").installFakeElectron();
const { createShowInfoDialog } = require("../main/ui-dialogs.js");
const { registerInstanceIpc } = require("../main/ipc/instance-ipc.js");
const { createGglLog } = require("../lib/ggl-structured-log");

const OPTIONS = { type: "info", title: "標題", message: "內容" };
const noLog = () => {};

test("B10u 活視窗 ⇒ 帶 parent；destroyed 的視窗、沒有視窗 ⇒ 不帶", async () => {
  const calls = [];
  electron.showMessageBox = async (...args) => {
    calls.push(args);
    return { response: 0 };
  };

  const win = { isDestroyed: () => false };
  await createShowInfoDialog(() => win, noLog)("標題", "內容");
  assert.deepEqual(calls, [[win, OPTIONS]]);
  assert.equal(calls[0][0], win);

  for (const getMainWindow of [() => ({ isDestroyed: () => true }), () => null]) {
    calls.length = 0;
    await createShowInfoDialog(getMainWindow, noLog)("標題", "內容");
    assert.deepEqual(calls, [[OPTIONS]]);
  }
});

test("Q-DLG 沒給 logError ⇒ 建立時就丟，不留到跳框失敗才在 catch 裡壞", () => {
  assert.throws(() => createShowInfoDialog(() => null), TypeError);
});

test("Q-DLG 跳框失敗 ⇒ 更新的結果照樣回給畫面、記一筆 dialog_failed，檔裡只有 title、沒有本文與錯誤訊息", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ggl-dialog-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filePath = path.join(dir, "ggl-launcher.log");
  t.mock.method(console, "error", () => {});
  const { gglError } = createGglLog({
    getFilePath: () => filePath,
    homedir: os.homedir(),
    maxBytes: 1024 * 1024,
  });
  const logged = [];
  const logError = (...args) => {
    logged.push(args);
    gglError(...args);
  };
  electron.showMessageBox = async () => {
    throw new Error("dialog broke SECRET-IN-MESSAGE");
  };

  const movedAside = [{ from: "mods/a.jar", to: "mods/a.jar.ggl-moved" }];
  const handlers = new Map();
  registerInstanceIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps: { updateInstance: async () => ({ movedAside }) },
    showInfoDialog: createShowInfoDialog(() => null, logError),
  });

  const result = await handlers.get("instance:update")({ sender: {} });
  assert.deepEqual(result, { movedAside });
  assert.equal(logged.length, 1);
  const [scope, event, , detail] = logged[0];
  assert.deepEqual(
    [scope, event, detail],
    ["main", "dialog_failed", { title: "部分檔案已移到旁邊" }],
  );
  const raw = fs.readFileSync(filePath, "utf8");
  assert.match(raw, /"e":"dialog_failed"/);
  assert.ok(!raw.includes("SECRET-IN-MESSAGE"), raw);
  assert.ok(!raw.includes("mods/a.jar"), raw);
});
