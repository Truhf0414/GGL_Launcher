"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { startServer, serveWithRange } = require("./helpers/local-http.cjs");
const {
  useMockClock,
  until,
  watch,
  stillPending,
} = require("./helpers/mock-clock.cjs");
const {
  configureNetFetch,
  fetchWithNiceError,
  downloadToFile,
  downloadToFileWithStallGuard,
  STALL_WINDOW_MS,
  STALL_MIN_BYTES,
  withRetries,
} = require("../main/net-fetch.js");

/** p 在 ms 內沒結果 ⇒ 回 "pending"；有結果 ⇒ { ok, value | error } */
function settleWithin(p, ms) {
  let timer;
  const pending = new Promise((resolve) => {
    timer = setTimeout(() => resolve("pending"), ms);
  });
  return Promise.race([
    p.then(
      (value) => ({ ok: true, value }),
      (error) => ({ ok: false, error }),
    ),
    pending,
  ]).finally(() => clearTimeout(timer));
}

/** 寫完 headers、送 100 bytes 就停住 */
function stallAfterHeaders(req, res) {
  res.writeHead(200, { "content-length": "5000000" });
  res.write(Buffer.alloc(100));
}

test("fetchWithNiceError: external abort after headers interrupts a pending body read with its reason", async (t) => {
  const srv = await startServer(stallAfterHeaders);
  t.after(() => srv.close());

  const outer = new AbortController();
  const res = await fetchWithNiceError(srv.url, { signal: outer.signal });
  const reader = res.body.getReader();
  await reader.read(); // 收到那 100 bytes，接下來就停住

  const reason = Object.assign(new Error("stall"), { code: "TEST_STALL" });
  setTimeout(() => outer.abort(reason), 100);
  const r = await settleWithin(reader.read(), 2000);

  assert.notEqual(
    r,
    "pending",
    "abort 之後 read() 仍卡住：外部 signal 在 headers 後沒傳到 fetch",
  );
  assert.equal(r.ok, false);
  assert.equal(r.error, reason);
});

test("fetchWithNiceError: no response before timeoutMs still fails as 連線失敗", async (t) => {
  const srv = await startServer(() => {}); // 永不回 headers
  t.after(() => srv.close());
  await assert.rejects(
    fetchWithNiceError(srv.url, { timeoutMs: 200 }),
    /^Error: 連線失敗：/,
  );
});

// ── downloadToFile 的 expectedSize（.part 已滿 ⇒ 續傳 Range 越界，真站台回 416）──

const BODY = Buffer.from("0123456789".repeat(100)); // 1000 bytes

async function tempTarget(t) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-dl-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  return path.join(dir, "blob");
}

test("downloadToFile: full .part without expectedSize hits 416 (documents the real-site behaviour)", async (t) => {
  const srv = await startServer((req, res) => serveWithRange(req, res, BODY));
  t.after(() => srv.close());
  const target = await tempTarget(t);
  await fsp.writeFile(`${target}.part`, BODY);

  await assert.rejects(
    downloadToFile(srv.url, target, null, { resume: true }),
    /HTTP 416/,
  );
  assert.equal(srv.requests[0].headers.range, "bytes=1000-");
});

test("downloadToFile: .part equal to expectedSize ⇒ no request, renamed to target", async (t) => {
  const srv = await startServer((req, res) => serveWithRange(req, res, BODY));
  t.after(() => srv.close());
  const target = await tempTarget(t);
  await fsp.writeFile(`${target}.part`, BODY);

  await downloadToFile(srv.url, target, null, {
    resume: true,
    expectedSize: BODY.length,
  });

  assert.equal(srv.requests.length, 0);
  assert.deepEqual(await fsp.readFile(target), BODY);
  await assert.rejects(fsp.stat(`${target}.part`), { code: "ENOENT" });
});

test("downloadToFile: .part larger than expectedSize ⇒ discarded, downloaded from 0 without Range", async (t) => {
  const srv = await startServer((req, res) => serveWithRange(req, res, BODY));
  t.after(() => srv.close());
  const target = await tempTarget(t);
  await fsp.writeFile(
    `${target}.part`,
    Buffer.concat([BODY, Buffer.from("junk")]),
  );

  await downloadToFile(srv.url, target, null, {
    resume: true,
    expectedSize: BODY.length,
  });

  assert.equal(srv.requests.length, 1);
  assert.equal(srv.requests[0].headers.range, undefined);
  assert.deepEqual(await fsp.readFile(target), BODY);
});

test("downloadToFile: short .part still resumes with Range when expectedSize is given", async (t) => {
  const srv = await startServer((req, res) => serveWithRange(req, res, BODY));
  t.after(() => srv.close());
  const target = await tempTarget(t);
  await fsp.writeFile(`${target}.part`, BODY.subarray(0, 400));

  await downloadToFile(srv.url, target, null, {
    resume: true,
    expectedSize: BODY.length,
  });

  assert.equal(srv.requests[0].headers.range, "bytes=400-");
  assert.deepEqual(await fsp.readFile(target), BODY);
});

// ── downloadToFileWithStallGuard（D2）：期限一律注入短值 ──
// 看門狗的時間交給 mock 時鐘，事情到了才推進；不跟真時鐘賭（→ _notes/plans/test-real-clock.md）

const GUARD = { windowMs: 300, minBytes: 1000 };
// 看門狗退步時這些案例會永遠等下去；設上限讓它變成紅燈而不是卡住整個 npm test
const HANG_LIMIT_MS = 5000;

test(
  "stall guard: body stalls after headers ⇒ GGL_DOWNLOAD_STALLED, retried once with Range, not before the second window",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const clock = useMockClock(t);
    const srv = await startServer(stallAfterHeaders);
    t.after(() => srv.close());
    const target = await tempTarget(t);

    let chunks = 0;
    const p = downloadToFileWithStallGuard(srv.url, target, () => chunks++, {
      ...GUARD,
      resume: true,
      stallRetries: 1,
      stallMessage: "測試：停住了",
    });
    const w = watch(p);
    await until(() => srv.requests.length === 1 && chunks === 1, "第一次收到 100 bytes");
    clock.advance(GUARD.windowMs);
    await until(() => srv.requests.length === 2 && chunks === 2, "帶 Range 重試、收到 100 bytes");
    assert.ok(await stillPending(w), "第二個窗口到之前不該結束");
    clock.advance(GUARD.windowMs);
    await assert.rejects(
      p,
      (e) => e.code === "GGL_DOWNLOAD_STALLED" && e.message === "測試：停住了",
    );
    assert.equal(srv.requests.length, 2);
    assert.equal(srv.requests[0].headers.range, undefined);
    assert.equal(srv.requests[1].headers.range, "bytes=100-");
  },
);

test(
  "stall guard: headers never arrive ⇒ also stalled",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const clock = useMockClock(t);
    const srv = await startServer(() => {});
    t.after(() => srv.close());
    const target = await tempTarget(t);

    const p = downloadToFileWithStallGuard(srv.url, target, null, {
      ...GUARD,
      stallRetries: 0,
    });
    const w = watch(p);
    await until(() => srv.requests.length === 1, "請求送達");
    assert.ok(await stillPending(w), "窗口到之前不該結束");
    // signal 已中止的下載不再重試（④b R#28）：只推進一個窗口就該結束，不必再等 650 ms 的重試等待
    clock.advance(GUARD.windowMs);
    await assert.rejects(p, { code: "GGL_DOWNLOAD_STALLED" });
    assert.equal(srv.requests.length, 1);
  },
);

test(
  "stall guard: slow but progressing download is not interrupted",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const clock = useMockClock(t);
    const chunk = Buffer.alloc(400, 1);
    // server 的 setInterval 也在 mock 名單裡：每推進 50 ms 送一塊
    const srv = await startServer((req, res) => {
      res.writeHead(200, { "content-length": String(chunk.length * 8) });
      res.write(chunk);
      let sent = 1;
      const iv = setInterval(() => {
        res.write(chunk);
        if (++sent === 8) {
          clearInterval(iv);
          res.end();
        }
      }, 50); // 每 300 ms 窗口 ≥ 2000 bytes，明顯高於 minBytes 1000；總長 350 ms，跨過第一個窗口
    });
    t.after(() => srv.close());
    const target = await tempTarget(t);

    let received = 0;
    const p = downloadToFileWithStallGuard(
      srv.url,
      target,
      (info) => (received += info.bytes),
      { ...GUARD, stallRetries: 0 },
    );
    await until(() => received === chunk.length, "收到第一塊");
    for (let n = 2; n <= 8; n++) {
      clock.advance(50);
      await until(() => received === chunk.length * n, `收到第 ${n} 塊`);
    }
    await p;
    assert.equal((await fsp.stat(target)).size, chunk.length * 8);
    assert.equal(srv.requests.length, 1);
  },
);

test("stall guard: defaults are 30 s / 1 MiB", () => {
  assert.equal(STALL_WINDOW_MS, 30_000);
  assert.equal(STALL_MIN_BYTES, 1024 * 1024);
});

test("downloadToFile: onChunk reports each chunk's bytes; they add up to what this call received", async (t) => {
  const srv = await startServer((req, res) => serveWithRange(req, res, BODY));
  t.after(() => srv.close());
  const target = await tempTarget(t);
  await fsp.writeFile(`${target}.part`, BODY.subarray(0, 400));

  let sum = 0;
  let last = null;
  await downloadToFile(
    srv.url,
    target,
    (info) => {
      sum += info.bytes;
      last = info;
    },
    { resume: true },
  );

  assert.equal(sum, 600); // 續傳只收後 600 bytes
  assert.equal(last.received, 1000); // received 仍是含 .part 的累計
});

test(
  "downloadToFile: timeoutMs reaches the header timeout (the stall guard relies on it)",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const clock = useMockClock(t);
    const srv = await startServer(() => {}); // 永不回 headers
    t.after(() => srv.close());
    const target = await tempTarget(t);
    // 重試提示在排上 650 ms 等待的同一段同步程式裡發出：拿它當「等待已排上」的訊號
    let retries = 0;
    configureNetFetch({ onRetryNotify: () => retries++ });
    t.after(() => configureNetFetch({}));

    const p = downloadToFile(srv.url, target, null, { timeoutMs: 200 });
    const w = watch(p);
    // 一次 200 ms 逾時＋650 ms 重試等待＋第二次 200 ms
    await until(() => srv.requests.length === 1, "第一次請求送達");
    clock.advance(200);
    await until(() => retries === 1, "排上重試等待");
    clock.advance(650);
    await until(() => srv.requests.length === 2, "第二次請求送達");
    assert.ok(await stillPending(w), "第二次逾時之前不該結束");
    clock.advance(200);
    await assert.rejects(p, /連線失敗/);
  },
);

// ── 看門狗收外部 signal、中止後不重試 → _notes/plans/instance-sync-v3-commit4b.md T2、T3 ──

test(
  "T2a stall guard: external abort mid-body ⇒ not reported as stalled, one request",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const srv = await startServer(stallAfterHeaders);
    t.after(() => srv.close());
    const target = await tempTarget(t);

    const outer = new AbortController();
    let chunks = 0;
    const p = downloadToFileWithStallGuard(srv.url, target, () => chunks++, {
      windowMs: 60_000,
      minBytes: 1,
      stallRetries: 1,
      signal: outer.signal,
    });
    // 收到 body 之後才中止：「body 讀到一半」由事件決定，不靠計時器
    await until(() => chunks === 1, "收到第一塊 body");
    outer.abort();
    await assert.rejects(p, (e) => e.code !== "GGL_DOWNLOAD_STALLED");
    assert.equal(srv.requests.length, 1);
  },
);

test(
  "T2b stall guard: external abort while waiting for headers ⇒ rejects on the abort itself, no retry",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    // 時間不推進：結束只可能來自中止本身，不是哪個計時器（取代原本「中止後 300 ms 內」的真時間上限）
    useMockClock(t);
    const srv = await startServer(() => {}); // 永不回 headers
    t.after(() => srv.close());
    const target = await tempTarget(t);

    const outer = new AbortController();
    const p = downloadToFileWithStallGuard(srv.url, target, null, {
      windowMs: 60_000,
      minBytes: 1,
      signal: outer.signal,
    });
    const w = watch(p);
    await until(() => srv.requests.length === 1, "請求送達");
    assert.ok(await stillPending(w), "中止之前不該結束");
    outer.abort();
    await assert.rejects(p);
    assert.equal(srv.requests.length, 1);
  },
);

test(
  "stall guard: watchdog fires and the external signal aborts in the same tick ⇒ not reported as stalled (Codex #3)",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const srv = await startServer(stallAfterHeaders);
    t.after(() => srv.close());
    const target = await tempTarget(t);
    // 只換看門狗用的 setInterval 與 Date；fetch 自己的 setTimeout 照真的走
    t.mock.timers.enable({ apis: ["setInterval", "Date"] });

    const outer = new AbortController();
    const p = downloadToFileWithStallGuard(srv.url, target, null, {
      windowMs: 1000,
      minBytes: 1,
      stallRetries: 0,
      signal: outer.signal,
    });
    while (srv.requests.length === 0) await new Promise((r) => setImmediate(r));
    t.mock.timers.tick(1000); // 看門狗中止
    outer.abort(); // 同一個 tick 裡外部也中止
    await assert.rejects(p, (e) => e.code !== "GGL_DOWNLOAD_STALLED");
  },
);

test("T3 withRetries: shouldRetry () => false ⇒ a retryable error is tried once", async () => {
  let calls = 0;
  await assert.rejects(
    withRetries(
      async () => {
        calls += 1;
        throw new Error("下載失敗：HTTP 503");
      },
      { retries: 3, baseDelayMs: 1, shouldRetry: () => false },
    ),
    /HTTP 503/,
  );
  assert.equal(calls, 1);
});

test("T3 withRetries: without shouldRetry the default still retries a retryable error", async () => {
  let calls = 0;
  await assert.rejects(
    withRetries(
      async () => {
        calls += 1;
        throw new Error("下載失敗：HTTP 503");
      },
      { retries: 1, baseDelayMs: 1 },
    ),
    /HTTP 503/,
  );
  assert.equal(calls, 2);
});
