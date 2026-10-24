"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { ALLOWED_INVOKE } = require("../lib/ipc-channels.js");
const {
  collectRegisteredHandlers,
  compareWithAllowlist,
} = require("../scripts/lib/ipc-registry.js");

test("main 註冊的 handler 與畫面允許呼叫的 channel 一一對上", () => {
  const handlers = collectRegisteredHandlers();
  assert.deepEqual(compareWithAllowlist(ALLOWED_INVOKE, handlers), {
    missing: [],
    extra: [],
    duplicated: [],
  });
});

test("註冊寫成多行也認得出是哪支檔（dialog-ipc 的 handle 被排版拆成兩行）", () => {
  const handlers = collectRegisteredHandlers();
  const dialog = handlers.find((h) => h.channel === "dialog:selectDirectory");
  assert.equal(dialog?.file, "main/ipc/dialog-ipc.js");
});

test("registerAllMainIpc 呼叫第二次 ⇒ 第一條 channel 就明確丟錯，已註冊的 handler 一個都沒被換掉", () => {
  const { registerAllMainIpc } = require("../main/ipc/index.js");
  // 照 Electron 的行為：同一個 channel 第二次 handle 丟錯（訊息照 plans/cross-review-2026-10.md §5.5 實測）、
  // removeHandler 真的移除——有人在註冊前先 removeHandler，舊 handler 就會被無聲換掉，下面的比對會抓到
  const handlers = new Map();
  const ipcMain = {
    handle(channel, fn) {
      if (handlers.has(channel)) throw new Error(`Attempted to register a second handler for '${channel}'`);
      handlers.set(channel, fn);
    },
    removeHandler(channel) {
      handlers.delete(channel);
    },
  };
  registerAllMainIpc({ ipcMain, deps: {} });
  const first = new Map(handlers);
  assert.throws(
    () => registerAllMainIpc({ ipcMain, deps: {} }),
    /Attempted to register a second handler for 'account:get'/,
  );
  assert.equal(handlers.size, first.size);
  for (const [channel, fn] of first) assert.equal(handlers.get(channel), fn, channel);
});

test("compareWithAllowlist 抓得到缺、多、重複", () => {
  const result = compareWithAllowlist(
    ["a", "b", "c"],
    [{ channel: "a" }, { channel: "a" }, { channel: "c" }, { channel: "x" }],
  );
  assert.deepEqual(result, { missing: ["b"], extra: ["x"], duplicated: ["a"] });
});
