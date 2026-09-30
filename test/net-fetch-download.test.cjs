"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { startServer, serveWithRange } = require("./helpers/local-http.cjs");
const {
  fetchWithNiceError,
  downloadToFile,
  downloadToFileWithStallGuard,
  downloadToFileWithFallback,
  STALL_WINDOW_MS,
  STALL_MIN_BYTES,
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

const GUARD = { windowMs: 300, minBytes: 1000 };
// 看門狗退步時這些案例會永遠等下去；設上限讓它變成紅燈而不是卡住整個 npm test
const HANG_LIMIT_MS = 5000;

test(
  "stall guard: body stalls after headers ⇒ GGL_DOWNLOAD_STALLED, retried once with Range, within bound",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const srv = await startServer(stallAfterHeaders);
    t.after(() => srv.close());
    const target = await tempTarget(t);

    const t0 = Date.now();
    await assert.rejects(
      downloadToFileWithStallGuard(srv.url, target, null, {
        ...GUARD,
        resume: true,
        stallRetries: 1,
        stallMessage: "測試：停住了",
      }),
      (e) => e.code === "GGL_DOWNLOAD_STALLED" && e.message === "測試：停住了",
    );
    assert.ok(
      Date.now() - t0 < GUARD.windowMs * 2 * 3,
      `took ${Date.now() - t0} ms`,
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
    const srv = await startServer(() => {});
    t.after(() => srv.close());
    const target = await tempTarget(t);

    const t0 = Date.now();
    await assert.rejects(
      downloadToFileWithStallGuard(srv.url, target, null, {
        ...GUARD,
        stallRetries: 0,
      }),
      { code: "GGL_DOWNLOAD_STALLED" },
    );
    // downloadToFile 內部對「連線失敗」有一次 650 ms 的重試等待；signal 已中斷，重試立刻失敗
    assert.ok(
      Date.now() - t0 < GUARD.windowMs * 3 + 650,
      `took ${Date.now() - t0} ms`,
    );
    assert.equal(srv.requests.length, 1);
  },
);

test(
  "stall guard: slow but progressing download is not interrupted",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const chunk = Buffer.alloc(400, 1);
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
      }, 50); // 每 300 ms 窗口 ≥ 2000 bytes，明顯高於 minBytes 1000；總長約 350 ms，跨過第一個窗口
    });
    t.after(() => srv.close());
    const target = await tempTarget(t);

    await downloadToFileWithStallGuard(srv.url, target, null, {
      ...GUARD,
      stallRetries: 0,
    });
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

// ── downloadToFileWithFallback（D3）：改接看門狗；每個來源開始前先刪 .part（§上層沒列 7）──

const OTHER = Buffer.from("abcdefghij".repeat(100)); // 另一家的檔，同樣 1000 bytes

test(
  "fallback: first source stalls ⇒ second source used, first requested once",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const a = await startServer(stallAfterHeaders);
    const b = await startServer((req, res) => serveWithRange(req, res, BODY));
    t.after(() => Promise.all([a.close(), b.close()]));
    const target = await tempTarget(t);

    const used = await downloadToFileWithFallback(
      [
        { name: "A", url: a.url },
        { name: "B", url: b.url },
      ],
      target,
      null,
      { resume: true, ...GUARD },
    );

    assert.equal(used.name, "B");
    assert.equal(a.requests.length, 1);
    assert.deepEqual(await fsp.readFile(target), BODY);
  },
);

test(
  "fallback: half-written .part from a stalled source is not continued by the next source",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const a = await startServer((req, res) => {
      res.writeHead(200, { "content-length": String(OTHER.length) });
      res.write(OTHER.subarray(0, 500)); // 送一半就停
    });
    const b = await startServer((req, res) => serveWithRange(req, res, BODY));
    t.after(() => Promise.all([a.close(), b.close()]));
    const target = await tempTarget(t);

    await downloadToFileWithFallback(
      [
        { name: "A", url: a.url },
        { name: "B", url: b.url },
      ],
      target,
      null,
      { resume: true, windowMs: 300, minBytes: 100 },
    );

    assert.equal(b.requests[0].headers.range, undefined);
    assert.deepEqual(await fsp.readFile(target), BODY);
  },
);

test("fallback: a leftover .part from an earlier run is not continued", async (t) => {
  const b = await startServer((req, res) => serveWithRange(req, res, BODY));
  t.after(() => b.close());
  const target = await tempTarget(t);
  await fsp.writeFile(`${target}.part`, OTHER.subarray(0, 500));

  await downloadToFileWithFallback([{ name: "B", url: b.url }], target, null, {
    resume: true,
    ...GUARD,
  });

  assert.equal(b.requests[0].headers.range, undefined);
  assert.deepEqual(await fsp.readFile(target), BODY);
});

test(
  "fallback: every source stalls ⇒ the mirror-too-slow message",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const a = await startServer(stallAfterHeaders);
    t.after(() => a.close());
    const target = await tempTarget(t);

    await assert.rejects(
      downloadToFileWithFallback([{ name: "A", url: a.url }], target, null, {
        resume: true,
        ...GUARD,
      }),
      /所有鏡像下載速度都過慢/,
    );
  },
);

test(
  "downloadToFile: timeoutMs reaches the header timeout (the stall guard relies on it)",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const srv = await startServer(() => {}); // 永不回 headers
    t.after(() => srv.close());
    const target = await tempTarget(t);
    const t0 = Date.now();
    await assert.rejects(
      downloadToFile(srv.url, target, null, { timeoutMs: 200 }),
      /連線失敗/,
    );
    // 一次 200 ms 逾時＋650 ms 重試等待＋第二次 200 ms
    assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0} ms`);
  },
);
