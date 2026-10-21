"use strict";

// 計時測試的壓力檢查（npm run test:freeze）：測試裡任何 http.Server 收到請求時，
// 先同步卡住事件迴圈 FREEZE_MS（預設 350）再交給 handler，模擬「請求在路上時行程被搶走 CPU」。
// 用真時鐘賭期限的測試會在這裡紅；時間交給 MockTimers 推進的測試不受影響。
// 隨機時點卡頓撞不到請求在路上那幾毫秒，所以只在收到請求時卡（→ _notes/plans/test-real-clock.md §驗收）。
// 請求很多的測試（例如裝一整套 runtime，約 90 個請求）每個都卡會累積撞到測試自己的防卡死上限，
// 所以預設只卡第 OFFSET、OFFSET+n、… 個請求（FREEZE_EVERY 預設 8；從 0 數，每個行程各自數）；
// 把 FREEZE_OFFSET 從 0 跑到 n-1，每個請求都會被卡到一次。FREEZE_EVERY=1 ＝每個都卡。
// FREEZE_MARK＝檔案路徑時，每個載入它的行程結束時寫一行（卡了幾次／收到幾個請求），用來確認真的生效。

const http = require("http");

const FREEZE_MS = Number(process.env.FREEZE_MS || 350);
const EVERY = Math.max(1, Number(process.env.FREEZE_EVERY || 8));
const OFFSET = Number(process.env.FREEZE_OFFSET || 0);
const origEmit = http.Server.prototype.emit;
let seen = 0;
let frozen = 0;

http.Server.prototype.emit = function (event, ...args) {
  if (event === "request" && seen++ % EVERY === OFFSET % EVERY) {
    frozen++;
    const end = performance.now() + FREEZE_MS;
    while (performance.now() < end) {}
  }
  return origEmit.call(this, event, ...args);
};

if (process.env.FREEZE_MARK) {
  process.on("exit", () => {
    require("fs").appendFileSync(
      process.env.FREEZE_MARK,
      `freeze-on-request ${FREEZE_MS}ms every=${EVERY} offset=${OFFSET} pid=${process.pid} 收到 ${seen} 個請求、卡了 ${frozen} 次\n`,
    );
  });
}
