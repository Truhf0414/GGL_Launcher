"use strict";

// F-5：下載必須走 HTTP/1.1。站台（Cloudflare）同時提供 h2 與 http/1.1；undici 預設會挑 h2，
// 在 Owner 的網路上比強制 HTTP/1.1 慢約 12 倍（機制未驗，→ main/net-fetch.js downloadAgent 的註解）。
// 測試用本機 TLS 伺服器同時提供兩者，看伺服器實際收到的 httpVersion。
// 設定 TLS 信任是行程層級的狀態，所以獨立成一檔，不外洩到別的測試檔。

const test = require("node:test");
const assert = require("node:assert/strict");

const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { Agent, fetch: undiciFetch } = require("undici");
const {
  startH2AndH1Server,
  trustTestCertificate,
} = require("./helpers/local-https.cjs");
const { downloadToFile } = require("../main/net-fetch.js");

const BODY = Buffer.alloc(1024, 0x47);

test.before(() => trustTestCertificate());

async function serve(t) {
  const srv = await startH2AndH1Server((req, res) => {
    res.writeHead(200, { "content-length": String(BODY.length) });
    res.end(BODY);
  });
  t.after(() => srv.close());
  return srv;
}

test("F-5 control: a default undici Agent negotiates HTTP/2 with the test server (so the server really offers h2)", async (t) => {
  const srv = await serve(t);
  const agent = new Agent();
  t.after(() => agent.close());

  const res = await undiciFetch(srv.url, { dispatcher: agent });
  await res.arrayBuffer();

  assert.equal(srv.requests.length, 1);
  assert.equal(srv.requests[0].httpVersion, "2.0");
});

test("F-5: downloadToFile talks HTTP/1.1 to a server that offers both h2 and http/1.1", async (t) => {
  const srv = await serve(t);
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-dl-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const target = path.join(dir, "blob");

  await downloadToFile(srv.url, target, null);

  assert.deepEqual(await fsp.readFile(target), BODY);
  assert.equal(srv.requests.length, 1);
  assert.equal(srv.requests[0].httpVersion, "1.1");
});

test("F-5: a resumed download (Range) also talks HTTP/1.1", async (t) => {
  const srv = await serve(t);
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-dl-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const target = path.join(dir, "blob");
  // 已有半截的 .part：續傳會帶 Range；伺服器回 200 全部，downloadToFile 丟掉 .part 從頭寫
  await fsp.writeFile(target + ".part", BODY.subarray(0, 100));

  await downloadToFile(srv.url, target, null, { resume: true });

  assert.deepEqual(await fsp.readFile(target), BODY);
  assert.equal(srv.requests.at(-1).httpVersion, "1.1");
  assert.match(String(srv.requests[0].headers.range), /^bytes=100-$/);
});
