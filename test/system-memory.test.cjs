"use strict";

// 系統 RAM 偵測（main/system-memory.js）：os.totalmem() 回 0＝libuv 的「不知道」⇒ null，
// 設定頁顯示「無法偵測系統記憶體」，不報一個錯的建議值。
// → _notes/plans/cross-review-2026-10-phase6b4.md #8；裁決 Q7（算 OS 邊界）

const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");

const { getSystemMemoryGb } = require("../main/system-memory.js");

test("os.totalmem() 回 0 ⇒ null（不是 Math.max 墊出來的 1）", (t) => {
  const original = os.totalmem;
  t.after(() => {
    os.totalmem = original;
  });
  os.totalmem = () => 0;
  assert.equal(getSystemMemoryGb(), null);
});
