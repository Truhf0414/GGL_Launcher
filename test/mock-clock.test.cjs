"use strict";

// mock 時鐘 helper 的兩個保證（→ _notes/plans/test-real-clock.md）：
// 1. 別案留下的計時器在本案被 clear（fetch 收尾前一案的連線時就會這樣），不弄掉本案的計時器；
// 2. 測試結束後全域計時器換回真的，不會一案包一層。
// test/helpers/mock-clock.cjs 拿掉 ignoreForeignClears 時，第 1 點的第一案會紅。

const test = require("node:test");
const assert = require("node:assert/strict");

const { useMockClock } = require("./helpers/mock-clock.cjs");

const REAL = {
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};

let leftover;
test("mock-clock：前一案留下一個計時器", (t) => {
  useMockClock(t);
  setTimeout(() => {}, 50);
  leftover = setTimeout(() => {}, 3000);
});

for (let i = 1; i <= 3; i++) {
  test(`mock-clock：別案的計時器在本案被 clear，本案的計時器照常觸發（第 ${i} 次）`, (t) => {
    const clock = useMockClock(t);
    const fired = [];
    setTimeout(() => fired.push("a"), 100);
    setTimeout(() => fired.push("b"), 300);
    clearTimeout(leftover);
    clock.advance(300);
    assert.deepEqual(fired, ["a", "b"]);
  });
}

test("mock-clock：本案自己的計時器照常可以 clear", (t) => {
  const clock = useMockClock(t);
  let fired = false;
  const h = setTimeout(() => (fired = true), 100);
  clearTimeout(h);
  const iv = setInterval(() => (fired = true), 50);
  clearInterval(iv);
  clock.advance(500);
  assert.equal(fired, false);
});

test("mock-clock：測試結束後全域計時器換回真的", () => {
  for (const [name, fn] of Object.entries(REAL)) {
    assert.equal(globalThis[name], fn, name);
  }
});
