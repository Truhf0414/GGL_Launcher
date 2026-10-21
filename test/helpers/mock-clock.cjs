"use strict";

// 計時測試的時鐘：setTimeout／setInterval／Date 交給 MockTimers，時間只在測試 advance 時前進。
// 產品的期限、看門狗不會因為行程被搶走 CPU 而自己到期（→ _notes/plans/test-real-clock.md）。
// 等待一律用 until：setImmediate 輪詢（不在 mock 名單裡），上限用 performance.now 的真時間。
// node:test 的 { timeout } 在 mock 下照常生效（Node 22、24 實測）。

const APIS = ["setTimeout", "setInterval", "Date"];

/** 條件成立才回；真時間 limitMs 內不成立 ⇒ 丟錯，訊息帶 what */
async function until(cond, what, limitMs = 5000) {
  const end = performance.now() + limitMs;
  while (!cond()) {
    if (performance.now() > end) throw new Error(`等不到：${what}`);
    await new Promise((r) => setImmediate(r));
  }
}

const clocks = new WeakMap();

/**
 * 在這個測試裡開 mock 時鐘；測試結束 node:test 會自己還原。同一案呼叫第二次（例如共用的 setup 被叫兩次）回同一個時鐘。
 * advance 一次不要跨過一個以上的窗口：一次推進裡 Date 已經在終點，看門狗只檢查得到一次
 * （一次推 600 不會在第二個 300 窗口中止；分兩次各推 300 才會，Node 22／24 實測）。
 * @returns {{ advance: (ms: number) => void, until: typeof until }}
 */
function useMockClock(t) {
  if (!clocks.has(t)) {
    t.mock.timers.enable({ apis: APIS });
    ignoreForeignClears();
    clocks.set(t, { advance: (ms) => t.mock.timers.tick(ms), until });
  }
  return clocks.get(t);
}

// fetch（undici）會在下一案才收尾前一案被中斷的連線，收尾時拿前一案 mock 建的計時器呼叫 clearTimeout；
// MockTimers 照 handle 上記的佇列位置刪，刪掉的會是本案的計時器（推進時間也不觸發）。
// connection: close 擋不到回應停在半路的連線（Node 22 實測），所以這裡只放行本案自己建的 handle
// （→ _notes/plans/test-real-clock.md；回歸測試 test/mock-clock.test.cjs）。
// 包的是 enable 之後的 mock 版本；測試結束 node:test 換回真的計時器，這層跟著消失。
function ignoreForeignClears() {
  const mine = new WeakSet();
  for (const [set, clear] of [
    ["setTimeout", "clearTimeout"],
    ["setInterval", "clearInterval"],
  ]) {
    const mockSet = globalThis[set];
    const mockClear = globalThis[clear];
    globalThis[set] = function (...args) {
      const handle = mockSet.apply(this, args);
      mine.add(handle);
      return handle;
    };
    globalThis[clear] = function (handle) {
      if (handle !== null && typeof handle === "object" && !mine.has(handle)) return;
      return mockClear.call(this, handle);
    };
  }
}

/** 記下 p 結束了沒；p 本身照常可再 await／assert.rejects（這裡接住了，不會變成未處理的 rejection） */
function watch(p) {
  const w = { done: false };
  const mark = () => {
    w.done = true;
  };
  p.then(mark, mark);
  return w;
}

/** 讓出 rounds 輪 setImmediate（已到的 I/O 跑完）後，w 是否仍未結束——斷言「推進時間前不會結束」用 */
async function stillPending(w, rounds = 20) {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setImmediate(r));
  return !w.done;
}

module.exports = { useMockClock, until, watch, stillPending };
