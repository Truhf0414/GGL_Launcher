"use strict";

// 輪詢一次（tick）的錯誤出口：main 沒有全域的 unhandledRejection 處理，tick 的 catch 是唯一的落點，
// 要寫常駐日誌、不吞（6b-1 B8 → _notes/plans/cross-review-2026-10-phase6b.md D5）。
// 輪詢的計時器是模組層的、沒有停止的 API：獨立一檔（node --test 一檔一個行程），計時器交給 mock 時鐘。

const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("net");

const { useMockClock, until } = require("./helpers/mock-clock.cjs");
const {
  configureServerStatus,
  startServerStatusPolling,
} = require("../main/server-status.js");

/** 開了再關的本機埠：連上去會立刻被拒，探測回 false、不靠計時器 */
async function closedPort() {
  const srv = net.createServer();
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const { port } = srv.address();
  await new Promise((r) => srv.close(r));
  return port;
}

test("B8 tick 裡丟錯 ⇒ 注入的 gglError 收到一次 server_status_tick_failed、不帶 detail", async (t) => {
  useMockClock(t);
  const port = await closedPort();
  const boom = new Error("boom");
  const errors = [];
  configureServerStatus({
    sendServerStatus: () => {
      throw boom;
    },
    serverStatusHost: "127.0.0.1",
    serverStatusPort: port,
    serverStatusUrl: "",
    gglError: (...args) => errors.push(args),
  });
  startServerStatusPolling();
  await until(() => errors.length > 0, "tick 的錯進常駐日誌");
  assert.deepEqual(errors, [["main", "server_status_tick_failed", boom]]);
});
