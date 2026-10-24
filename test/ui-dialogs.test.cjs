"use strict";

// showInfoDialog 只在主視窗活著時掛上去：與 game-closed-dialog 同一條規則
// （A11 → _notes/plans/instance-sync-v3-commit3b2a.md；6b-1 B10u → _notes/plans/cross-review-2026-10-phase6b.md D6）

const test = require("node:test");
const assert = require("node:assert/strict");

const electron = require("./helpers/fake-electron.cjs").installFakeElectron();
const { createShowInfoDialog } = require("../main/ui-dialogs.js");

const OPTIONS = { type: "info", title: "標題", message: "內容" };

test("B10u 活視窗 ⇒ 帶 parent；destroyed 的視窗、沒有視窗 ⇒ 不帶", async () => {
  const calls = [];
  electron.showMessageBox = async (...args) => {
    calls.push(args);
    return { response: 0 };
  };

  const win = { isDestroyed: () => false };
  await createShowInfoDialog(() => win)("標題", "內容");
  assert.deepEqual(calls, [[win, OPTIONS]]);
  assert.equal(calls[0][0], win);

  for (const getMainWindow of [() => ({ isDestroyed: () => true }), () => null]) {
    calls.length = 0;
    await createShowInfoDialog(getMainWindow)("標題", "內容");
    assert.deepEqual(calls, [[OPTIONS]]);
  }
});
