"use strict";

// 啟動鈕內的狀態文字（renderer/ready-status.js）：ensureReadyStatusText＝回到靜止文字。
// 可啟動 ⇒「準備就緒」；不可啟動 ⇒ 清空——開啟時的「正在檢查版本…」與暫時訊息不能一直掛著
// （手測 2026-10-07：not-installed 時「正在檢查版本…」永遠不消失）。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { loadRendererModule, makeCtx } = require("./helpers/fake-dom.cjs");

const READY_STATUS = path.join(__dirname, "..", "renderer", "ready-status.js");

function setup({
  canLaunch,
  launcherBusy = false,
  gameRunning = false,
  guard = false,
  noStatusYet = false,
}) {
  const win = loadRendererModule(READY_STATUS);
  const writes = [];
  const rs = win.GglRendererReadyStatus.createReadyStatus({
    ctx: makeCtx({ fx: { setStatus: (text, p) => writes.push([text, p]) } }),
    statusGuard: { isErrorGuardActive: () => guard },
    getBusyState: () => ({ launcherBusy, gameRunning }),
    getInstanceStatus: () => (noStatusYet ? null : { ui: { canLaunch } }),
  });
  return { rs, writes };
}

test("可啟動 ⇒ 準備就緒", () => {
  const { rs, writes } = setup({ canLaunch: true });
  rs.ensureReadyStatusText();
  assert.deepEqual(writes, [["準備就緒", 0]]);
});

test("不可啟動（例：not-installed）⇒ 清空文字，不留開啟時的「正在檢查版本…」", () => {
  const { rs, writes } = setup({ canLaunch: false });
  rs.ensureReadyStatusText();
  assert.deepEqual(writes, [["", 0]]);
});

test("busy／遊戲執行中／錯誤保護期間 ⇒ 不動文字", () => {
  for (const s of [
    { canLaunch: false, launcherBusy: true },
    { canLaunch: false, gameRunning: true },
    { canLaunch: false, guard: true },
  ]) {
    const { rs, writes } = setup(s);
    rs.ensureReadyStatusText();
    assert.deepEqual(writes, [], JSON.stringify(s));
  }
});

// Codex 審查 2026-10-08 #1：還沒收到第一筆狀態＝不知道能不能啟動，不能當成「不可啟動」把開啟時的文字清掉
test("還沒收到第一筆 instance:status ⇒ 不動文字", () => {
  const { rs, writes } = setup({ canLaunch: false, noStatusYet: true });
  rs.ensureReadyStatusText();
  assert.deepEqual(writes, []);
});
