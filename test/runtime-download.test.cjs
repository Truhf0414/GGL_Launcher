"use strict";

// → _notes/plans/instance-sync-v3-commit4b.md T4–T7

const test = require("node:test");
const assert = require("node:assert/strict");

const crypto = require("crypto");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { startServer } = require("./helpers/local-http.cjs");
const {
  fetchJsonWithDeadline,
  fetchTextWithDeadline,
  createSourceHealth,
  runPoolUntilFirstError,
  downloadRuntimeFile,
} = require("../main/runtime/download.js");

const HANG_LIMIT_MS = 5000;
const STALL = { windowMs: 300, minBytes: 1 };
const DEADLINE_MS = 300;

const sha = (algo, buf) => crypto.createHash(algo).update(buf).digest("hex");
const BODY = Buffer.from("runtime-file-".repeat(80));
const WRONG = Buffer.from("not-the-file-".repeat(80));

/** 寫完 headers 就停住，body 一個 byte 都不送 */
function stallAfterHeaders(req, res) {
  res.writeHead(200, { "content-length": "5000000" });
  res.flushHeaders();
}

const serve = (buf) => (req, res) => {
  res.writeHead(200, { "content-length": String(buf.length) });
  res.end(buf);
};
const status = (code) => (req, res) => {
  res.writeHead(code);
  res.end();
};

async function tempDir(t) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-rt-dl-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  return dir;
}

const exists = (p) => fsp.stat(p).then(() => true, () => false);

// ── T4 fetchJsonWithDeadline／fetchTextWithDeadline ──

test("T4 fetchJsonWithDeadline: 正常 ⇒ 物件", async (t) => {
  const srv = await startServer(serve(Buffer.from('{"a":1}')));
  t.after(() => srv.close());
  assert.deepEqual(await fetchJsonWithDeadline(srv.url, { deadlineMs: DEADLINE_MS }), {
    a: 1,
  });
});

test(
  "T4 fetchJsonWithDeadline: headers 後 body 停住 ⇒ 期限內以 GGL_FETCH_DEADLINE 失敗",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const srv = await startServer(stallAfterHeaders);
    t.after(() => srv.close());
    const t0 = Date.now();
    await assert.rejects(fetchJsonWithDeadline(srv.url, { deadlineMs: DEADLINE_MS }), {
      code: "GGL_FETCH_DEADLINE",
    });
    assert.ok(Date.now() - t0 < DEADLINE_MS * 3, `took ${Date.now() - t0} ms`);
  },
);

test("T4 fetchJsonWithDeadline: 404 ⇒ 錯誤含 HTTP 404", async (t) => {
  const srv = await startServer(status(404));
  t.after(() => srv.close());
  await assert.rejects(fetchJsonWithDeadline(srv.url, { deadlineMs: DEADLINE_MS }), /HTTP 404/);
});

test("T4 fetchJsonWithDeadline: 不是 JSON ⇒ 丟錯", async (t) => {
  const srv = await startServer(serve(Buffer.from("<html>")));
  t.after(() => srv.close());
  await assert.rejects(fetchJsonWithDeadline(srv.url, { deadlineMs: DEADLINE_MS }), /JSON/);
});

test(
  "T4 fetchJsonWithDeadline: 外部中止 ⇒ 立刻丟、不是期限錯",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const srv = await startServer(stallAfterHeaders);
    t.after(() => srv.close());
    const outer = new AbortController();
    const p = fetchJsonWithDeadline(srv.url, { deadlineMs: 60_000, signal: outer.signal });
    let abortedAt = 0;
    setTimeout(() => {
      abortedAt = Date.now();
      outer.abort();
    }, 100);
    await assert.rejects(p, (e) => e?.code !== "GGL_FETCH_DEADLINE");
    assert.ok(Date.now() - abortedAt < 200, `took ${Date.now() - abortedAt} ms`);

    const pre = new AbortController();
    pre.abort();
    const before = srv.requests.length;
    await assert.rejects(fetchJsonWithDeadline(srv.url, { signal: pre.signal }));
    assert.equal(srv.requests.length, before);
  },
);

test(
  "T4 fetchTextWithDeadline: body 停住 ⇒ GGL_FETCH_DEADLINE；正常 ⇒ 文字",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const stuck = await startServer(stallAfterHeaders);
    const ok = await startServer(serve(Buffer.from("abc  x.zip\n")));
    t.after(() => Promise.all([stuck.close(), ok.close()]));
    await assert.rejects(fetchTextWithDeadline(stuck.url, { deadlineMs: DEADLINE_MS }), {
      code: "GGL_FETCH_DEADLINE",
    });
    assert.equal(
      await fetchTextWithDeadline(ok.url, { deadlineMs: DEADLINE_MS }),
      "abc  x.zip\n",
    );
  },
);

// ── T5 runPoolUntilFirstError（手動 deferred，不靠計時器）──

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const ticks = async (n = 5) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
};

function controlledPool(n, concurrency) {
  const ds = Array.from({ length: n }, deferred);
  const started = [];
  const signals = [];
  let active = 0;
  let maxActive = 0;
  let settled = false;
  const p = runPoolUntilFirstError(
    ds.map((_, i) => i),
    concurrency,
    async (i, signal) => {
      started.push(i);
      signals[i] = signal;
      active += 1;
      maxActive = Math.max(maxActive, active);
      try {
        return await ds[i].promise;
      } finally {
        active -= 1;
      }
    },
  );
  p.then(
    () => (settled = true),
    () => (settled = true),
  );
  return {
    ds,
    started,
    signals,
    p,
    settled: () => settled,
    maxActive: () => maxActive,
  };
}

test("T5 第 2 項 reject ⇒ 丟它的錯；沒取走的不跑；進行中的收到中止；它 settle 前 pool 不回", async () => {
  const pool = controlledPool(6, 2);
  await ticks();
  assert.deepEqual(pool.started, [0, 1]);

  const err = new Error("item 1 failed");
  pool.ds[1].reject(err);
  await ticks();
  assert.equal(pool.signals[0].aborted, true);
  assert.equal(pool.settled(), false, "進行中的那支還沒 settle，pool 不該回");

  pool.ds[0].resolve();
  await assert.rejects(pool.p, (e) => e === err);
  assert.deepEqual(pool.started, [0, 1]);
});

test("T5 兩支都 reject ⇒ 丟先 reject 的那支", async () => {
  const pool = controlledPool(6, 2);
  await ticks();
  const first = new Error("first");
  pool.ds[1].reject(first);
  await ticks();
  pool.ds[0].reject(new Error("second"));
  await assert.rejects(pool.p, (e) => e === first);
});

test("T5 全部成功 ⇒ 每項各跑一次；最大同時進行數 ≤ 2", async () => {
  const pool = controlledPool(6, 2);
  for (let i = 0; i < 6; i++) {
    await ticks();
    pool.ds[i].resolve();
  }
  await pool.p;
  assert.deepEqual(
    [...pool.started].sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5],
  );
  assert.ok(pool.maxActive() <= 2, `maxActive ${pool.maxActive()}`);
});

test("T5 空陣列 ⇒ resolve；worker 同步 throw ⇒ 當成 reject", async () => {
  await runPoolUntilFirstError([], 6, () => {
    throw new Error("不該被呼叫");
  });
  const err = new Error("sync");
  await assert.rejects(
    runPoolUntilFirstError([1, 2, 3], 2, () => {
      throw err;
    }),
    (e) => e === err,
  );
});

// ── T6 downloadRuntimeFile ──

const SHA1 = sha("sha1", BODY);

test("T6a 第一台 520、第二台正常 ⇒ 檔到、sha1 對", { timeout: HANG_LIMIT_MS }, async (t) => {
  const a = await startServer(status(520));
  const b = await startServer(serve(BODY));
  t.after(() => Promise.all([a.close(), b.close()]));
  const dest = path.join(await tempDir(t), "f.jar");
  await downloadRuntimeFile({
    candidates: [
      { source: "a", url: a.url },
      { source: "b", url: b.url },
    ],
    dest,
    sha1: SHA1,
    deps: { stall: STALL },
  });
  assert.deepEqual(await fsp.readFile(dest), BODY);
});

test("T6b 第一台內容錯、第二台對 ⇒ 成功、dest 是對的內容", { timeout: HANG_LIMIT_MS }, async (t) => {
  const a = await startServer(serve(WRONG));
  const b = await startServer(serve(BODY));
  t.after(() => Promise.all([a.close(), b.close()]));
  const dest = path.join(await tempDir(t), "f.jar");
  await downloadRuntimeFile({
    candidates: [
      { source: "a", url: a.url },
      { source: "b", url: b.url },
    ],
    dest,
    sha1: SHA1,
    deps: { stall: STALL },
  });
  assert.deepEqual(await fsp.readFile(dest), BODY);
  assert.equal(a.requests.length, 1);
});

test("T6c 全部內容錯 ⇒ GGL_RUNTIME_DOWNLOAD_FAILED、訊息含每台、dest 與 .tmp 都不在", { timeout: HANG_LIMIT_MS }, async (t) => {
  const a = await startServer(serve(WRONG));
  const b = await startServer(serve(WRONG));
  t.after(() => Promise.all([a.close(), b.close()]));
  const dir = await tempDir(t);
  const dest = path.join(dir, "f.jar");
  await assert.rejects(
    downloadRuntimeFile({
      candidates: [
        { source: "src-a", url: a.url },
        { source: "src-b", url: b.url },
      ],
      dest,
      sha1: SHA1,
      deps: { stall: STALL },
    }),
    (e) =>
      e.code === "GGL_RUNTIME_DOWNLOAD_FAILED" &&
      e.message.includes("src-a") &&
      e.message.includes("src-b") &&
      e.message.includes("sha1"),
  );
  assert.deepEqual(await fsp.readdir(dir), []);
});

test("T6d 外部中止 ⇒ 丟錯、第二台零請求", { timeout: HANG_LIMIT_MS }, async (t) => {
  const a = await startServer(stallAfterHeaders);
  const b = await startServer(serve(BODY));
  t.after(() => Promise.all([a.close(), b.close()]));
  const dest = path.join(await tempDir(t), "f.jar");
  const outer = new AbortController();
  setTimeout(() => outer.abort(), 100);
  await assert.rejects(
    downloadRuntimeFile({
      candidates: [
        { source: "a", url: a.url },
        { source: "b", url: b.url },
      ],
      dest,
      sha1: SHA1,
      signal: outer.signal,
      deps: { stall: { windowMs: 60_000, minBytes: 1 } },
    }),
  );
  assert.equal(b.requests.length, 0);
  assert.equal(await exists(dest), false);
});

test("T6e 每台各自的 sha256：第一台對不上、第二台對 ⇒ 成功", { timeout: HANG_LIMIT_MS }, async (t) => {
  const a = await startServer(serve(BODY));
  const b = await startServer(serve(BODY));
  t.after(() => Promise.all([a.close(), b.close()]));
  const dest = path.join(await tempDir(t), "jre.zip");
  await downloadRuntimeFile({
    candidates: [
      { source: "a", url: a.url, sha256: sha("sha256", WRONG) },
      { source: "b", url: b.url, sha256: sha("sha256", BODY) },
    ],
    dest,
    deps: { stall: STALL },
  });
  assert.equal(a.requests.length, 1);
  assert.equal(b.requests.length, 1);
  assert.deepEqual(await fsp.readFile(dest), BODY);
});

test("T6f sha1 39 位 ⇒ 一個請求都不發就丟錯", async (t) => {
  const a = await startServer(serve(BODY));
  t.after(() => a.close());
  const dest = path.join(await tempDir(t), "f.jar");
  await assert.rejects(
    downloadRuntimeFile({
      candidates: [{ source: "a", url: a.url }],
      dest,
      sha1: "a".repeat(39),
    }),
    /sha1/,
  );
  await assert.rejects(
    downloadRuntimeFile({
      candidates: [{ source: "a", url: a.url, sha256: "b".repeat(63) }],
      dest,
    }),
    /sha256/,
  );
  assert.equal(a.requests.length, 0);
});

// ── T7 來源健康度（E2）──

test("T7 createSourceHealth：排序穩定、降級的排最後、降兩個維持相對順序", () => {
  const h = createSourceHealth();
  const c = ["a", "b", "c", "d"].map((source) => ({ source, url: source }));
  assert.deepEqual(h.order(c).map((x) => x.source), ["a", "b", "c", "d"]);
  h.demote("b");
  assert.deepEqual(h.order(c).map((x) => x.source), ["a", "c", "d", "b"]);
  h.demote("a");
  assert.deepEqual(h.order(c).map((x) => x.source), ["c", "d", "a", "b"]);
  assert.deepEqual(c.map((x) => x.source), ["a", "b", "c", "d"], "不改到傳入的陣列");
});

test("T7 停住一次就降級：第二個檔對第一台零請求", { timeout: HANG_LIMIT_MS }, async (t) => {
  const a = await startServer(stallAfterHeaders);
  const b = await startServer(serve(BODY));
  t.after(() => Promise.all([a.close(), b.close()]));
  const dir = await tempDir(t);
  const health = createSourceHealth();
  const lines = [];
  const opts = (name) => ({
    candidates: [
      { source: "a", url: `${a.url}/${name}` },
      { source: "b", url: `${b.url}/${name}` },
    ],
    dest: path.join(dir, name),
    sha1: SHA1,
    health,
    deps: { stall: STALL, log: (l) => lines.push(l) },
  });
  await downloadRuntimeFile(opts("one"));
  assert.equal(a.requests.length, 1);
  await downloadRuntimeFile(opts("two"));
  assert.equal(a.requests.length, 1, "第二個檔不該再試被降級的來源");
  assert.ok(lines.some((l) => l.startsWith("RUNTIME_DEMOTE a")), lines.join("\n"));
  assert.ok(lines.some((l) => l.startsWith("RUNTIME_SOURCE ")), lines.join("\n"));
});

test("T7 立刻失敗（520）不降級：第二個檔仍先試第一台（A13）", { timeout: HANG_LIMIT_MS }, async (t) => {
  const a = await startServer(status(520));
  const b = await startServer(serve(BODY));
  t.after(() => Promise.all([a.close(), b.close()]));
  const dir = await tempDir(t);
  const health = createSourceHealth();
  for (const name of ["one", "two"]) {
    await downloadRuntimeFile({
      candidates: [
        { source: "a", url: `${a.url}/${name}` },
        { source: "b", url: `${b.url}/${name}` },
      ],
      dest: path.join(dir, name),
      sha1: SHA1,
      health,
      deps: { stall: STALL },
    });
  }
  assert.equal(a.requests.length, 2);
});
