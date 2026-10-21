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

/**
 * 在這個測試裡開 mock 時鐘；測試結束 node:test 會自己還原。
 * @returns {{ advance: (ms: number) => void, until: typeof until }}
 */
function useMockClock(t) {
  t.mock.timers.enable({ apis: APIS });
  return { advance: (ms) => t.mock.timers.tick(ms), until };
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
