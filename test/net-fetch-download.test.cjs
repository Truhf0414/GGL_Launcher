"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const fs = require("fs");
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
    // 推進到窗口前 1 ms 仍未結束、再 1 ms 才結束：窗口被改短也抓得到
    clock.advance(GUARD.windowMs - 1);
    assert.ok(await stillPending(w), "窗口到之前不該結束");
    // signal 已中止的下載不再重試（④b R#28）：只推進一個窗口就該結束，不必再等 650 ms 的重試等待
    clock.advance(1);
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

// ── X1：寫檔失敗要 reject 原始錯誤、不 uncaught、不掛死、放掉連線 → _notes/plans/cross-review-2026-10-x1.md ──

/** 本案期間的 uncaughtException；node --test 自己也會算到當下的案上，這裡讓失敗訊息指得出是哪個錯 */
function countUncaught(t) {
  const seen = [];
  const on = (e) => seen.push(e?.code ?? String(e));
  process.on("uncaughtException", on);
  t.after(() => process.off("uncaughtException", on));
  return seen;
}

/** 真時間 limitMs 內等 p 結束；結束後讓出幾輪，同一個錯的 'error' 事件（舊碼在這附近 uncaught）有機會浮出來 */
async function outcome(p, what, limitMs = 2000) {
  let r = null;
  p.then(
    (value) => (r = { ok: true, value }),
    (error) => (r = { ok: false, error }),
  );
  await until(() => r !== null, what, limitMs);
  for (let i = 0; i < 5; i++) await new Promise((res) => setImmediate(res));
  return r;
}

/** 寫完 headers 就停住，body 一個位元組都不送 */
function headersOnly(req, res) {
  res.writeHead(200, { "content-length": "5000000" });
  res.flushHeaders();
}

for (const [label, handler] of [
  [
    "A body 1000 B",
    (req, res) => {
      res.writeHead(200, { "content-length": "1000" });
      res.end(Buffer.alloc(1000, 1));
    },
  ],
  [
    "B body 0 B",
    (req, res) => {
      res.writeHead(200, { "content-length": "0" });
      res.end();
    },
  ],
]) {
  test(
    `X1 ${label}: .tmp is a directory ⇒ rejects EISDIR, nothing uncaught`,
    { timeout: HANG_LIMIT_MS },
    async (t) => {
      const seen = countUncaught(t);
      const srv = await startServer(handler);
      t.after(() => srv.close());
      const target = await tempTarget(t);
      await fsp.mkdir(`${target}.tmp`);

      const r = await outcome(
        downloadToFile(srv.url, target, null),
        "下載結束",
      );
      assert.equal(r.ok, false);
      assert.equal(r.error.code, "EISDIR");
      assert.deepEqual(seen, []);
    },
  );
}

test(
  "X1 C: headers then the body stalls, .tmp is a directory ⇒ EISDIR without any timer",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    useMockClock(t); // 時間不推進：結束只可能來自開檔失敗本身，不是哪個計時器
    const seen = countUncaught(t);
    const srv = await startServer(headersOnly);
    t.after(() => srv.close());
    const target = await tempTarget(t);
    await fsp.mkdir(`${target}.tmp`);

    const r = await outcome(
      downloadToFile(srv.url, target, null),
      "開檔失敗就結束",
    );
    assert.equal(r.ok, false);
    assert.equal(r.error.code, "EISDIR");
    assert.deepEqual(seen, []);
  },
);

test(
  "X1 C2: same under the stall guard ⇒ EISDIR, not reported as stalled, one request",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    useMockClock(t);
    const seen = countUncaught(t);
    const srv = await startServer(headersOnly);
    t.after(() => srv.close());
    const target = await tempTarget(t);
    await fsp.mkdir(`${target}.tmp`);

    const r = await outcome(
      downloadToFileWithStallGuard(srv.url, target, null, {
        ...GUARD,
        stallRetries: 1,
      }),
      "開檔失敗就結束",
    );
    assert.equal(r.ok, false);
    assert.equal(r.error.code, "EISDIR");
    assert.equal(srv.requests.length, 1);
    assert.deepEqual(seen, []);
  },
);

test(
  "X1 E: second write to the .tmp fails ENOSPC ⇒ rejects that error, no retry, connection closed",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const seen = countUncaught(t);
    const target = await tempTarget(t);
    const tmp = `${target}.tmp`;

    // 只動這個 .tmp：open 記下它的 fd，write 只對那個 fd 計數；其他 fd 原樣轉給真的函式
    const realOpen = fs.open;
    const realWrite = fs.write;
    t.after(() => {
      fs.open = realOpen;
      fs.write = realWrite;
    });
    const enospc = Object.assign(
      new Error("ENOSPC: no space left on device, write"),
      { code: "ENOSPC", errno: -28, syscall: "write" },
    );
    let fd = null;
    let writes = 0;
    let sendSecond = null;
    fs.open = function (p, ...rest) {
      if (p !== tmp) return realOpen.call(this, p, ...rest);
      const cb = rest.pop();
      return realOpen.call(this, p, ...rest, (err, got) => {
        if (!err) fd = got;
        cb(err, got);
      });
    };
    fs.write = function (f, ...rest) {
      if (f !== fd) return realWrite.call(this, f, ...rest);
      const cb = rest.pop();
      writes += 1;
      if (writes === 2) return process.nextTick(cb, enospc);
      return realWrite.call(this, f, ...rest, (...args) => {
        cb(...args);
        sendSecond();
      });
    };

    let closed = false;
    const srv = await startServer((req, res) => {
      res.on("close", () => (closed = true));
      res.writeHead(200, { "content-length": "5000000" });
      res.write(Buffer.alloc(1000, 1));
      // 第一塊寫進檔之後才送第二塊，保證有第 2 次寫入；之後停住、不 end：連線被關只可能來自 client
      sendSecond = () => res.write(Buffer.alloc(1000, 2));
    });
    t.after(() => srv.close());

    const r = await outcome(
      downloadToFile(srv.url, target, null),
      "寫入失敗就結束",
    );
    assert.equal(r.ok, false);
    assert.equal(r.error, enospc);
    assert.equal(writes, 2);
    assert.equal(srv.requests.length, 1);
    // cancel 不 await：觀察 server 在期限內看到連線被關，不宣稱 reject 當下已經關了
    await until(() => closed, "server 看到連線被關", 2000);
    assert.deepEqual(seen, []);
  },
);

// ── N6：.tmp／.part 是連結 ⇒ 只刪連結本身、照常下載、記一行 debug log（→ _notes/plans/cross-review-2026-10-n6.md §回歸測試 T-N*）──

const { snapshot } = require("./helpers/fs-snapshot.cjs");

/** target 旁邊放 outside/ 當連結的目標 */
async function linkTarget(t) {
  const target = await tempTarget(t);
  const outside = path.join(path.dirname(target), "outside");
  await fsp.mkdir(path.join(outside, "dir"), { recursive: true });
  await fsp.writeFile(path.join(outside, "dir", "keep.txt"), "keep");
  return { target, outside };
}

/** 換掉 net-fetch 的 debug log，收下每一行；fail 決定 logger 自己怎麼壞 */
function captureNetLog(t, fail = null) {
  const lines = [];
  configureNetFetch({
    appendLauncherLog:
      fail === "throw"
        ? (line) => {
            lines.push(line);
            throw new Error("log down");
          }
        : async (line) => {
            lines.push(line);
            if (fail === "reject") throw new Error("log down");
          },
  });
  t.after(() => configureNetFetch({}));
  return lines;
}

/** log 晚一個 microtask 才送出；讓出幾輪再斷言 */
async function settle() {
  for (let i = 0; i < 5; i++) await new Promise((res) => setImmediate(res));
}

async function assertRegularFile(p, bytes) {
  const st = await fsp.lstat(p);
  assert.ok(st.isFile() && !st.isSymbolicLink(), `${p} 應該是一般檔`);
  assert.deepEqual(await fsp.readFile(p), bytes);
}

function serveBody(t) {
  return startServer((req, res) => serveWithRange(req, res, BODY)).then((srv) => {
    t.after(() => srv.close());
    return srv;
  });
}

test("T-N1 N6: .tmp is a file symlink ⇒ succeeds, outside untouched, target is a regular file, one log line", async (t) => {
  const lines = captureNetLog(t);
  const srv = await serveBody(t);
  const { target, outside } = await linkTarget(t);
  await fsp.writeFile(path.join(outside, "victim.bin"), "VICTIM");
  await fsp.symlink(path.join(outside, "victim.bin"), `${target}.tmp`, "file");
  const before = await snapshot(outside);

  await downloadToFile(srv.url, target, null);
  await settle();

  assert.deepEqual(await snapshot(outside), before);
  await assertRegularFile(target, BODY);
  assert.deepEqual(lines, [`DOWNLOAD_TEMP_LINK_REMOVED ${target}.tmp`]);
});

for (const [label, victim] of [
  ["a 0-byte file", ""],
  ["a shorter file (the site answers Range with 206)", "VICTIM"],
  ["a file that does not exist", null],
]) {
  test(`T-N2 N6: .part is a file symlink to ${label} ⇒ succeeds from 0 without Range, outside untouched`, async (t) => {
    const lines = captureNetLog(t);
    const srv = await serveBody(t);
    const { target, outside } = await linkTarget(t);
    const victimPath = path.join(outside, "victim.bin");
    if (victim !== null) await fsp.writeFile(victimPath, victim);
    await fsp.symlink(victimPath, `${target}.part`, "file");
    const before = await snapshot(outside);

    await downloadToFile(srv.url, target, null, {
      resume: true,
      expectedSize: BODY.length,
    });
    await settle();

    assert.deepEqual(await snapshot(outside), before);
    assert.equal(srv.requests.length, 1);
    assert.equal(srv.requests[0].headers.range, undefined);
    await assertRegularFile(target, BODY);
    assert.deepEqual(lines, [`DOWNLOAD_TEMP_LINK_REMOVED ${target}.part`]);
  });
}

test("T-N3 N6: .part is a file symlink exactly expectedSize long ⇒ the link is not renamed into the target; one request", async (t) => {
  const lines = captureNetLog(t);
  const srv = await serveBody(t);
  const { target, outside } = await linkTarget(t);
  await fsp.writeFile(path.join(outside, "victim.bin"), Buffer.alloc(BODY.length, 0x58));
  await fsp.symlink(path.join(outside, "victim.bin"), `${target}.part`, "file");
  const before = await snapshot(outside);

  await downloadToFile(srv.url, target, null, {
    resume: true,
    expectedSize: BODY.length,
  });
  await settle();

  assert.equal(srv.requests.length, 1);
  await assertRegularFile(target, BODY);
  assert.deepEqual(await snapshot(outside), before);
  assert.deepEqual(lines, [`DOWNLOAD_TEMP_LINK_REMOVED ${target}.part`]);
});

test("T-N4 N6: .part is a junction ⇒ succeeds instead of EISDIR, the junction is gone, outside untouched", async (t) => {
  const lines = captureNetLog(t);
  const srv = await serveBody(t);
  const { target, outside } = await linkTarget(t);
  await fsp.symlink(path.join(outside, "dir"), `${target}.part`, "junction");
  const before = await snapshot(outside);

  await downloadToFile(srv.url, target, null, {
    resume: true,
    expectedSize: BODY.length,
  });
  await settle();

  await assert.rejects(fsp.lstat(`${target}.part`), { code: "ENOENT" });
  assert.deepEqual(await snapshot(outside), before);
  await assertRegularFile(target, BODY);
  assert.deepEqual(lines, [`DOWNLOAD_TEMP_LINK_REMOVED ${target}.part`]);
});

test("T-N5 N6: a regular short .part still resumes with Range and logs nothing", async (t) => {
  const lines = captureNetLog(t);
  const srv = await serveBody(t);
  const target = await tempTarget(t);
  await fsp.writeFile(`${target}.part`, BODY.subarray(0, 400));

  await downloadToFile(srv.url, target, null, {
    resume: true,
    expectedSize: BODY.length,
  });
  await settle();

  assert.equal(srv.requests[0].headers.range, "bytes=400-");
  await assertRegularFile(target, BODY);
  assert.deepEqual(lines, []);
});

test("T-N6 N6: .tmp is a regular folder ⇒ still rejects EISDIR, the folder stays, nothing logged", async (t) => {
  const lines = captureNetLog(t);
  const srv = await serveBody(t);
  const target = await tempTarget(t);
  await fsp.mkdir(`${target}.tmp`);
  await fsp.writeFile(path.join(`${target}.tmp`, "inside.txt"), "inside");

  await assert.rejects(downloadToFile(srv.url, target, null), { code: "EISDIR" });
  await settle();

  assert.deepEqual(await snapshot(`${target}.tmp`), {
    "inside.txt": Buffer.from("inside").toString("base64"),
  });
  assert.deepEqual(lines, []);
});

test("T-N7 N6: a regular short .part and a site that ignores Range (200) ⇒ the .part is replaced, target is right", async (t) => {
  const srv = await startServer((req, res) => {
    res.writeHead(200, { "content-length": String(BODY.length) });
    res.end(BODY);
  });
  t.after(() => srv.close());
  const target = await tempTarget(t);
  await fsp.writeFile(`${target}.part`, Buffer.alloc(400, 0x58));

  await downloadToFile(srv.url, target, null, {
    resume: true,
    expectedSize: BODY.length,
  });

  assert.equal(srv.requests.length, 1);
  assert.equal(srv.requests[0].headers.range, "bytes=400-");
  await assertRegularFile(target, BODY);
  await assert.rejects(fsp.lstat(`${target}.part`), { code: "ENOENT" });
});

for (const fail of ["throw", "reject"]) {
  test(`T-N8 N6: the debug logger fails (${fail}) ⇒ the download still succeeds, outside untouched, nothing unhandled`, async (t) => {
    const uncaught = countUncaught(t);
    const unhandled = [];
    const onUnhandled = (e) => unhandled.push(String(e?.message ?? e));
    process.on("unhandledRejection", onUnhandled);
    t.after(() => process.off("unhandledRejection", onUnhandled));
    const lines = captureNetLog(t, fail);
    const srv = await serveBody(t);
    const { target, outside } = await linkTarget(t);
    await fsp.writeFile(path.join(outside, "victim.bin"), "VICTIM");
    await fsp.symlink(path.join(outside, "victim.bin"), `${target}.tmp`, "file");
    const before = await snapshot(outside);

    await downloadToFile(srv.url, target, null);
    await settle();

    assert.deepEqual(await snapshot(outside), before);
    await assertRegularFile(target, BODY);
    assert.equal(lines.length, 1);
    assert.deepEqual(unhandled, []);
    assert.deepEqual(uncaught, []);
  });
}

// ── X1b：特定 undici 的 assert(!this.paused)（nodejs/undici#5360）→ _notes/plans/cross-review-2026-10-x1b.md ──
// 只有帶這個 assert 的 undici 會紅（Node 22.23.4、24.18 以上、Electron 24.20）；較舊的 Node 上永遠綠。
// 觸發條件：parser 因為 body 沒人讀而暫停時，對端結束連線（startServer 一律 connection: close）。

/** 本案期間的 unhandledRejection */
function countUnhandled(t) {
  const seen = [];
  const on = (e) => seen.push(e?.code ?? String(e));
  process.on("unhandledRejection", on);
  t.after(() => process.off("unhandledRejection", on));
  return seen;
}

/** 只對 p 的 fs.open 延後 ms 才真的開；其他路徑原樣轉給真的函式 */
function delayOpen(t, p, ms) {
  const realOpen = fs.open;
  t.after(() => {
    fs.open = realOpen;
  });
  fs.open = function (q, ...rest) {
    if (q !== p) return realOpen.call(this, q, ...rest);
    setTimeout(() => realOpen.call(this, q, ...rest), ms);
  };
}

/** 只對 p 開出來的 fd，每次 fs.write 的 callback 延後 ms（慢磁碟）；其他 fd 原樣轉 */
function slowWrites(t, p, ms) {
  const realOpen = fs.open;
  const realWrite = fs.write;
  t.after(() => {
    fs.open = realOpen;
    fs.write = realWrite;
  });
  let fd = null;
  fs.open = function (q, ...rest) {
    if (q !== p) return realOpen.call(this, q, ...rest);
    const cb = rest.pop();
    return realOpen.call(this, q, ...rest, (err, got) => {
      if (!err) fd = got;
      cb(err, got);
    });
  };
  fs.write = function (f, ...rest) {
    if (f !== fd) return realWrite.call(this, f, ...rest);
    const cb = rest.pop();
    return realWrite.call(this, f, ...rest, (...args) =>
      setTimeout(() => cb(...args), ms),
    );
  };
}

function serveWhole(body) {
  return (req, res) => {
    res.writeHead(200, { "content-length": String(body.length) });
    res.end(body);
  };
}

test(
  "X1b U1: 64 KB body, connection: close, the .tmp opens 100 ms late ⇒ succeeds, nothing uncaught",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const uncaught = countUncaught(t);
    const unhandled = countUnhandled(t);
    const body = Buffer.alloc(64 * 1024, 0x55);
    const srv = await startServer(serveWhole(body));
    t.after(() => srv.close());
    const target = await tempTarget(t);
    delayOpen(t, `${target}.tmp`, 100);

    const r = await outcome(downloadToFile(srv.url, target, null), "下載結束");
    assert.equal(r.ok, true, String(r.error));
    assert.deepEqual(await fsp.readFile(target), body);
    assert.deepEqual(uncaught, []);
    assert.deepEqual(unhandled, []);
  },
);

test(
  "X1b U2: 1 MB body, connection: close, every write to the .tmp takes 5 ms ⇒ succeeds, nothing uncaught",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const uncaught = countUncaught(t);
    const unhandled = countUnhandled(t);
    const body = Buffer.alloc(1024 * 1024, 0x56);
    const srv = await startServer(serveWhole(body));
    t.after(() => srv.close());
    const target = await tempTarget(t);
    slowWrites(t, `${target}.tmp`, 5);

    const r = await outcome(downloadToFile(srv.url, target, null), "下載結束");
    assert.equal(r.ok, true, String(r.error));
    assert.deepEqual(await fsp.readFile(target), body);
    assert.deepEqual(uncaught, []);
    assert.deepEqual(unhandled, []);
  },
);
