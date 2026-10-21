"use strict";

// 共用假伺服器的連線不能拖到下一案：keep-alive 連線在下一案才關時，fetch 會拿前一案 mock 時鐘的計時器
// 去呼叫下一案 mock 的 clearTimeout，弄亂下一案的計時器佇列（→ _notes/plans/test-real-clock.md）。
// 每案：先設一個 300 ms 的 mock 計時器、讓出 I/O（前一案的連線關閉在這時落地）、抓一次、再推進 ⇒ 必須觸發。
// test/helpers/local-http.cjs 拿掉 connection: close 時，第 2 案起會紅。

const test = require("node:test");
const assert = require("node:assert/strict");

const { startServer } = require("./helpers/local-http.cjs");
const { useMockClock } = require("./helpers/mock-clock.cjs");

const yieldIo = async (rounds = 30) => {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setImmediate(r));
};

for (let i = 1; i <= 4; i++) {
  test(`startServer：連線不留到下一案、mock 計時器照常觸發（第 ${i} 案）`, { timeout: 5000 }, async (t) => {
    const clock = useMockClock(t);
    let fired = false;
    setTimeout(() => (fired = true), 300);
    await yieldIo();
    const srv = await startServer((req, res) => res.end("ok"));
    t.after(() => srv.close());
    assert.equal(await (await fetch(srv.url)).text(), "ok");
    await yieldIo();
    clock.advance(300);
    assert.equal(fired, true);
  });
}
