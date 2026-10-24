"use strict";

// X1b 第二層：載入 undici 8（net-fetch 為下載 require 它）會初始化全域 dispatcher，main 程序其他內建 fetch 的底層可能改變
// （→ _notes/plans/cross-review-2026-10-x1b.md X1b-D3、§回歸測試 第二層 H1–H5）。
// 同一組請求在三種載入條件下各用一個子行程送一次（a 不載入、b 先載入、c 先用內建 fetch 再載入），
// 伺服器收到的（method、url、headers、body）與客戶端拿到的（狀態、內容、解析結果、錯誤）三者要逐欄相同。
// 伺服器只有一個、子行程依序跑，所以連 Host 都相同，不必標準化任何 header。
// 先對條件 a 的結果驗預期值：三邊一起失敗（例如網址錯了）也會「相同」，比對本身證明不了請求真的照設計跑。

const test = require("node:test");
const assert = require("node:assert/strict");

const path = require("path");
const { execFile } = require("child_process");

const { startServer } = require("./helpers/local-http.cjs");

const CLIENT = path.join(__dirname, "helpers", "main-http-compat-client.cjs");
const CHILD_LIMIT_MS = 20_000;

const INDEX = {
  format: 3,
  gate: "gate.json",
  notice: "notice.json",
  release: "release.json",
  files: "files/",
};
const GATE = { maintenance: { enabled: false, message: "" } };
const RELEASE = {
  version: "GGL3.1.02",
  publishedAt: "2026-09-19T12:00:00+08:00",
  minecraft: "1.21.11",
  loader: { type: "fabric", version: "0.19.3" },
  playerEditable: ["config/"],
  files: [{ path: "mods/a.jar", sha256: "a".repeat(64), size: 1 }],
};

function json(res, body, status = 200) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

/** 送了 headers 和一段 body 就停住（要靠客戶端取消或中止才會關） */
function headersThenStall(status, bytes) {
  return (req, res) => {
    res.writeHead(status, { "content-length": String(1024 * 1024) });
    res.write(Buffer.alloc(bytes, 0x48));
  };
}

const ROUTES = {
  "/warmup": (req, res) => res.end("w"),
  "/h1/form": (req, res) => json(res, { ok: true }),
  "/h1/json": (req, res) => json(res, { ok: true }),
  "/h1/json-400": (req, res) => json(res, { XErr: 2148916233 }, 400),
  "/h1/bearer": (req, res) => json(res, { ok: true }),
  "/h1/text-404": (req, res) => {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not json");
  },
  "/h1/stall": () => {},
  "/h2/s/manifest.json": (req, res) => json(res, INDEX),
  "/h2/s/gate.json": (req, res) => json(res, GATE),
  "/h2/s/release.json": (req, res) => json(res, RELEASE),
  "/h2/530/manifest.json": headersThenStall(530, 64 * 1024),
  "/h2/stall/manifest.json": () => {},
  "/h3/ok": (req, res) => res.end("ok"),
  "/h3/503": (req, res) => {
    res.writeHead(503);
    res.end();
  },
  "/h4/text": (req, res) => res.end("hello h4"),
  "/h4/500": headersThenStall(500, 64 * 1024),
  "/h4/abort": headersThenStall(200, 100),
  "/h4/deadline": headersThenStall(200, 100),
  "/h4/probe-404": (req, res) => {
    res.writeHead(404);
    res.end();
  },
  "/h4/probe-ok": headersThenStall(206, 512 * 1024),
  "/h5/ok": (req, res) => json(res, { a: 1 }),
  "/h5/bad": (req, res) => res.end("not json {"),
  "/h5/500": (req, res) => {
    res.writeHead(500);
    res.end();
  },
};

/** 測試伺服器：照 ROUTES 回；記下每個請求的 method、url、headers、body；/_closed?p= 回該路徑最近一個請求的連線關了沒 */
async function compatServer(t) {
  const records = [];
  const closed = new Map();
  const srv = await startServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/_closed") {
      res.end(closed.get(url.searchParams.get("p")) ? "1" : "0");
      return;
    }
    const rec = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: "",
    };
    records.push(rec);
    req.on("data", (c) => (rec.body += c.toString("latin1")));
    closed.set(req.url, false);
    res.on("close", () => closed.set(req.url, true));
    const h = ROUTES[req.url];
    if (h) h(req, res);
    else json(res, { error: "no route" }, 599);
  });
  t.after(() => srv.close());
  return { url: srv.url, records };
}

/** 跑一個子行程，拿它印的那行 JSON 與伺服器在這段期間收到的請求（/warmup 只有條件 c 有，不比） */
async function runClient(server, mode, suite) {
  const from = server.records.length;
  const { stdout } = await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [CLIENT, mode, server.url, suite],
      { timeout: CHILD_LIMIT_MS },
      (err, stdout, stderr) =>
        err
          ? reject(
              new Error(
                `子行程 ${mode}/${suite} 沒有正常結束：${err.message}\n${stderr}`,
              ),
            )
          : resolve({ stdout }),
    );
  });
  const out = JSON.parse(stdout.trim());
  out.received = server.records.slice(from).filter((r) => r.url !== "/warmup");
  return out;
}

const byCase = (out) => Object.fromEntries(out.results.map((r) => [r.case, r]));

/** 條件 a 的預期值：比對三邊相同之前，先確定請求照設計跑了 */
function assertExpectedBaseline(main, offline, base) {
  const r = byCase(main);
  const value = (name) => {
    assert.equal(r[name]?.ok, true, `${name}：${JSON.stringify(r[name])}`);
    return r[name].value;
  };
  const error = (name) => {
    assert.equal(r[name]?.ok, false, `${name}：${JSON.stringify(r[name])}`);
    return r[name].error;
  };
  assert.deepEqual(value("H1 oauth form POST"), {
    status: 200,
    data: { ok: true },
  });
  assert.deepEqual(value("H1 xbl JSON POST"), {
    status: 200,
    ok: true,
    data: { ok: true },
  });
  assert.deepEqual(value("H1 xsts JSON POST, 400 with XErr"), {
    status: 400,
    ok: false,
    data: { XErr: 2148916233 },
  });
  assert.deepEqual(value("H1 profile Bearer GET"), {
    status: 200,
    ok: true,
    data: { ok: true },
  });
  assert.deepEqual(value("H1 Bearer GET, 404 not JSON (safeJson fallback)"), {
    status: 404,
    ok: false,
    data: null,
  });
  assert.equal(error("H1 no response before the deadline").name, "AbortError");

  const site = value("H2 fetchIndex ok, then fetchSite");
  assert.equal(site.index.side, "ok");
  assert.equal(site.site.gate.side, "ok");
  assert.equal(site.site.release.side, "ok");
  const h530 = value("H2 fetchIndex HTTP 530 (body cancelled)");
  assert.equal(h530.index.side, "unreachable");
  assert.equal(h530.index.status, 530);
  assert.equal(h530.closed, true);
  const stall = value("H2 fetchIndex no response before timeoutMs");
  assert.equal(stall.side, "unreachable");
  assert.equal(stall.reason, "network");

  assert.equal(value("H4 fetchTextWithDeadline with headers"), "hello h4");
  const h500 = value("H4 fetchTextWithDeadline HTTP 500 (body cancelled)");
  assert.equal(h500.error.message, `HTTP 500：${base}/h4/500`);
  assert.equal(h500.closed, true);
  assert.equal(
    error("H4 fetchTextWithDeadline external abort while the body stalls").code,
    "TEST_ABORT",
  );
  assert.equal(
    error("H4 fetchTextWithDeadline deadline while the body stalls").code,
    "GGL_FETCH_DEADLINE",
  );
  assert.deepEqual(
    value("H4 quick probe: Range, stops at 256 KB, failing source last"),
    {
      order: ["/h4/probe-ok", "/h4/probe-404"],
      closed: true,
    },
  );

  assert.deepEqual(value("H5 fetchJson ok"), { a: 1 });
  assert.equal(error("H5 fetchJson body is not JSON").name, "SyntaxError");
  assert.equal(
    error("H5 fetchJson HTTP 500 (retried once)").message,
    "下載 manifest 失敗：HTTP 500",
  );

  assert.equal(value("H3 server status /h3/ok"), "online");
  assert.equal(byCase(offline)["H3 server status /h3/503"]?.value, "offline");

  const got = (u) => main.received.filter((x) => x.url === u);
  assert.equal(
    got("/h1/form")[0].body,
    "client_id=test-client-id&grant_type=refresh_token&refresh_token=TEST-NOT-A-REAL-TOKEN",
  );
  assert.equal(
    got("/h1/form")[0].headers["content-type"],
    "application/x-www-form-urlencoded",
  );
  assert.equal(
    got("/h1/bearer")[0].headers.authorization,
    "Bearer TEST-MC-TOKEN",
  );
  assert.equal(got("/h4/text")[0].headers["x-ggl-test"], "1");
  assert.equal(got("/h4/probe-ok")[0].headers.range, "bytes=0-262143");
  assert.equal(got("/h5/500").length, 2);
}

test(
  "X1b H1–H5: main-process built-in fetch callers behave the same with undici 8 not loaded, loaded first, and loaded after a built-in fetch",
  { timeout: 6 * CHILD_LIMIT_MS },
  async (t) => {
    const server = await compatServer(t);
    const runs = {};
    for (const mode of ["a", "b", "c"]) {
      runs[mode] = {
        main: await runClient(server, mode, "main"),
        offline: await runClient(server, mode, "status-offline"),
      };
    }

    assert.equal(runs.a.main.diag.undici8Loaded, false);
    assert.equal(runs.b.main.diag.undici8Loaded, true);
    assert.equal(runs.c.main.diag.undici8Loaded, true);
    for (const mode of ["a", "b", "c"])
      t.diagnostic(
        `條件 ${mode} 的全域 dispatcher：${JSON.stringify(runs[mode].main.diag)}`,
      );

    assertExpectedBaseline(runs.a.main, runs.a.offline, server.url);

    for (const mode of ["b", "c"]) {
      for (const suite of ["main", "offline"]) {
        assert.deepEqual(
          runs[mode][suite].results,
          runs.a[suite].results,
          `條件 ${mode}／${suite}：客戶端結果與 a 不同`,
        );
        assert.deepEqual(
          runs[mode][suite].received,
          runs.a[suite].received,
          `條件 ${mode}／${suite}：伺服器收到的與 a 不同`,
        );
      }
    }
  },
);
