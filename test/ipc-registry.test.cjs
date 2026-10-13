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

test("compareWithAllowlist 抓得到缺、多、重複", () => {
  const result = compareWithAllowlist(
    ["a", "b", "c"],
    [{ channel: "a" }, { channel: "a" }, { channel: "c" }, { channel: "x" }],
  );
  assert.deepEqual(result, { missing: ["b"], extra: ["x"], duplicated: ["a"] });
});
