"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { reportStartupFailure } = require("../main/startup-failure.js");
const { SettingsError } = require("../main/settings.js");

// 呼叫依序記進 events：錯誤框在前、quit 在後
function fakes({ boxThrows = false } = {}) {
  const events = [];
  const boxes = [];
  return {
    events,
    boxes,
    app: { quit: () => events.push("quit") },
    showErrorBox: (title, content) => {
      events.push("box");
      boxes.push({ title, content });
      if (boxThrows) throw new Error("dialog failed");
    },
  };
}

test("reportStartupFailure: Error ⇒ one box with message and stack, then quit", () => {
  const f = fakes();
  const err = new Error("something broke");
  reportStartupFailure({ app: f.app, showErrorBox: f.showErrorBox, err });
  assert.deepEqual(f.events, ["box", "quit"]);
  assert.equal(f.boxes[0].title, "GGL Launcher 啟動失敗");
  assert.ok(f.boxes[0].content.includes("something broke"));
  assert.ok(f.boxes[0].content.includes(err.stack));
});

// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V17（D-SET-UI：設定錯誤不印 stack）
test("V17 設定錯誤碼 ⇒ 框裡是說明與路徑、不含 stack；其他錯誤（含 errno 錯）仍含 stack", () => {
  const settingsPath =
    "C:\\Users\\a\\AppData\\Roaming\\GGL_launcher\\settings.json";
  const errs = [
    new SettingsError("missing", settingsPath),
    new SettingsError("unreadable", settingsPath, {
      cause: Object.assign(new Error("EBUSY: resource busy or locked, open"), {
        code: "EBUSY",
        syscall: "open",
      }),
    }),
    new SettingsError("conflict", settingsPath, { step: "compare" }),
  ];
  for (const err of errs) {
    const f = fakes();
    reportStartupFailure({ app: f.app, showErrorBox: f.showErrorBox, err });
    const box = f.boxes[0].content;
    assert.ok(box.includes(err.message), box);
    assert.ok(box.includes(settingsPath), box);
    assert.ok(!box.includes(err.stack), `${err.reason}：不放 stack`);
    assert.ok(!/\n\s+at /.test(box), box);
    assert.deepEqual(f.events, ["box", "quit"]);
  }
  const fsErr = Object.assign(
    new Error("EPERM: operation not permitted, open"),
    {
      code: "EPERM",
      syscall: "open",
    },
  );
  const f = fakes();
  reportStartupFailure({
    app: f.app,
    showErrorBox: f.showErrorBox,
    err: fsErr,
  });
  assert.ok(f.boxes[0].content.includes(fsErr.stack));
});

test("reportStartupFailure: the box throwing still quits and does not throw", () => {
  const f = fakes({ boxThrows: true });
  assert.doesNotThrow(() =>
    reportStartupFailure({
      app: f.app,
      showErrorBox: f.showErrorBox,
      err: new Error("x"),
    }),
  );
  assert.deepEqual(f.events, ["box", "quit"]);
});

test("reportStartupFailure: a non-Error value shows up in the box", () => {
  const f = fakes();
  reportStartupFailure({
    app: f.app,
    showErrorBox: f.showErrorBox,
    err: "plain string failure",
  });
  assert.ok(f.boxes[0].content.includes("plain string failure"));
});
