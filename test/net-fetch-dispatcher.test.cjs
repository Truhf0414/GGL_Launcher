"use strict";

// X1b U5：下載走 net-fetch 自己建的 undici 8 Agent，不靠全域 dispatcher（→ _notes/plans/cross-review-2026-10-x1b.md X1b-D9）。
// 全域 dispatcher 是整個行程共用的狀態，所以獨立成一檔（node --test 每個測試檔一個行程），不外洩到別的測試檔。

const test = require("node:test");
const assert = require("node:assert/strict");

const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { Agent, getGlobalDispatcher, setGlobalDispatcher } = require("undici");
const { startServer } = require("./helpers/local-http.cjs");
const { downloadToFile } = require("../main/net-fetch.js");

const BODY = Buffer.alloc(1024, 0x47);

/** 全域換成「一要連線就失敗」的 dispatcher，數它被要求連線幾次；本案結束換回原本的 */
function failingGlobalDispatcher(t) {
  const before = getGlobalDispatcher();
  const used = { connects: 0 };
  setGlobalDispatcher(
    new Agent({
      connect: (opts, cb) => {
        used.connects += 1;
        cb(new Error("GLOBAL_DISPATCHER_USED"));
      },
    }),
  );
  t.after(() => setGlobalDispatcher(before));
  return used;
}

async function serve(t) {
  const srv = await startServer((req, res) => {
    res.writeHead(200, { "content-length": String(BODY.length) });
    res.end(BODY);
  });
  t.after(() => srv.close());
  return srv;
}

test("X1b U5 control: with the failing global dispatcher, the built-in fetch fails and never reaches the server", async (t) => {
  const used = failingGlobalDispatcher(t);
  const srv = await serve(t);

  await assert.rejects(fetch(srv.url), (e) => {
    assert.equal(e.cause?.message, "GLOBAL_DISPATCHER_USED");
    return true;
  });
  assert.ok(used.connects >= 1);
  assert.equal(srv.requests.length, 0);
});

test("X1b U5: with the failing global dispatcher, downloadToFile still downloads through its own Agent", async (t) => {
  const used = failingGlobalDispatcher(t);
  const srv = await serve(t);
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-dl-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const target = path.join(dir, "blob");

  await downloadToFile(srv.url, target, null);

  assert.deepEqual(await fsp.readFile(target), BODY);
  assert.equal(srv.requests.length, 1);
  assert.equal(used.connects, 0);
});
