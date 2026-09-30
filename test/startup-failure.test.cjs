"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { reportStartupFailure } = require("../main/startup-failure.js");

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
  const err = new Error("settings unreadable");
  reportStartupFailure({ app: f.app, showErrorBox: f.showErrorBox, err });
  assert.deepEqual(f.events, ["box", "quit"]);
  assert.equal(f.boxes[0].title, "GGL Launcher 啟動失敗");
  assert.ok(f.boxes[0].content.includes("settings unreadable"));
  assert.ok(f.boxes[0].content.includes(err.stack));
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
