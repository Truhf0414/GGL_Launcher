"use strict";

// 計時測試的壓力檢查（npm run test:freeze）：測試裡任何 http.Server 收到請求時，
// 先同步卡住事件迴圈 FREEZE_MS（預設 350）再交給 handler，模擬「請求在路上時行程被搶走 CPU」。
// 用真時鐘賭期限的測試會在這裡紅；時間交給 MockTimers 推進的測試不受影響。
// 隨機時點卡頓撞不到請求在路上那幾毫秒，所以只在收到請求時卡（→ _notes/plans/test-real-clock.md §驗收）。
// FREEZE_MARK＝檔案路徑時，每個載入它的行程寫一行，用來確認真的生效。

const http = require("http");

const FREEZE_MS = Number(process.env.FREEZE_MS || 350);
const origEmit = http.Server.prototype.emit;

http.Server.prototype.emit = function (event, ...args) {
  if (event === "request") {
    const end = performance.now() + FREEZE_MS;
    while (performance.now() < end) {}
  }
  return origEmit.call(this, event, ...args);
};

if (process.env.FREEZE_MARK) {
  require("fs").appendFileSync(
    process.env.FREEZE_MARK,
    `freeze-on-request ${FREEZE_MS}ms pid=${process.pid}\n`,
  );
}
