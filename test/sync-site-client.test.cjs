"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { startServer } = require("./helpers/local-http.cjs");
const {
  useMockClock,
  until,
  watch,
  stillPending,
} = require("./helpers/mock-clock.cjs");
const {
  createSiteClient,
  SITE_TIMEOUT_MS,
} = require("../main/sync/site-client.js");
const { summarizeManifestFetchFailure } = require("../lib/manifest-network.js");

const SHORT = 300; // 期限注入短值；時間交給 mock 時鐘，停住的案等請求到了才推進（→ _notes/plans/test-real-clock.md）
// 退步時（例如期限在 headers 到手就解除）這些案例會永遠等下去；設上限讓它變成紅燈而不是卡住整個 npm test
const HANG_LIMIT_MS = 5000;

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
const NOTICE = {
  notice: { title: "T", logUrl: "" },
  notifications: [{ id: "n1" }],
};

function json(res, body, status = 200) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

/** 路徑 → handler；沒列的一律 404 */
async function site(t, routes) {
  const srv = await startServer((req, res) => {
    const h = routes[req.url];
    if (h) h(req, res);
    else json(res, { error: "nope" }, 404);
  });
  t.after(() => srv.close());
  return srv;
}

const okSite = {
  "/s/manifest.json": (q, r) => json(r, INDEX),
  "/s/gate.json": (q, r) => json(r, GATE),
  "/s/release.json": (q, r) => json(r, RELEASE),
  "/s/notice.json": (q, r) => json(r, NOTICE),
};

const hits = (srv, p) => srv.requests.filter((r) => r.url === p).length;

// ── 分類（上層 §行為契約「抓取結果的分類」） ──

test("classify: HTTP 530 ⇒ unreachable/http with status and detail", async (t) => {
  useMockClock(t);
  const srv = await site(t, { "/m": (q, r) => json(r, {}, 530) });
  const r = await createSiteClient({ timeoutMs: SHORT }).fetchIndex(
    `${srv.url}/m`,
  );
  assert.deepEqual(r, {
    side: "unreachable",
    reason: "http",
    detail: "HTTP 530",
    status: 530,
  });
});

test("classify: HTTP 404 ⇒ invalid/http", async (t) => {
  useMockClock(t);
  const srv = await site(t, {});
  const r = await createSiteClient({ timeoutMs: SHORT }).fetchIndex(
    `${srv.url}/m`,
  );
  assert.deepEqual(r, {
    side: "invalid",
    reason: "http",
    detail: "HTTP 404",
    status: 404,
  });
});

test("classify: 2xx but not JSON ⇒ invalid/parse", async (t) => {
  useMockClock(t);
  const srv = await site(t, {
    "/m": (q, r) => (r.writeHead(200), r.end("<html>")),
  });
  const r = await createSiteClient({ timeoutMs: SHORT }).fetchIndex(
    `${srv.url}/m`,
  );
  assert.deepEqual(r, {
    side: "invalid",
    reason: "parse",
    detail: "內容不是 JSON",
    status: 200,
  });
});

test("classify: 2xx JSON that fails validation ⇒ invalid/invalid with the validator's message", async (t) => {
  useMockClock(t);
  const srv = await site(t, {
    "/m": (q, r) => json(r, { ...INDEX, format: 2 }),
  });
  const r = await createSiteClient({ timeoutMs: SHORT }).fetchIndex(
    `${srv.url}/m`,
  );
  assert.equal(r.side, "invalid");
  assert.equal(r.reason, "invalid");
  assert.match(r.detail, /^index\.format/);
});

test("classify: 3xx that reaches us (no Location) ⇒ unreachable/http (D13)", async (t) => {
  useMockClock(t);
  const srv = await site(t, { "/m": (q, r) => (r.writeHead(302), r.end()) });
  const r = await createSiteClient({ timeoutMs: SHORT }).fetchIndex(
    `${srv.url}/m`,
  );
  assert.equal(r.side, "unreachable");
  assert.equal(r.status, 302);
});

test("classify: status 0 ⇒ unreachable", async () => {
  const fetchImpl = async () => ({ status: 0, text: async () => "" });
  const r = await createSiteClient({ fetchImpl }).fetchIndex("https://x/m");
  assert.equal(r.side, "unreachable");
  assert.equal(r.reason, "http");
});

test("classify: connection refused ⇒ unreachable/network, detail from summarizeManifestFetchFailure", async () => {
  const srv = await startServer(() => {});
  const url = `${srv.url}/m`;
  await srv.close(); // 埠關掉 ⇒ 拒絕連線
  const r = await createSiteClient({ timeoutMs: SHORT }).fetchIndex(url);
  assert.equal(r.side, "unreachable");
  assert.equal(r.reason, "network");
  assert.equal(r.status, undefined);
  assert.equal(typeof r.detail, "string");
  assert.ok(r.detail.length > 0);
});

test(
  "classify: headers then body stalls ⇒ unreachable when the deadline passes, not before",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const clock = useMockClock(t);
    const srv = await site(t, {
      "/m": (q, r) => {
        r.writeHead(200, {
          "content-type": "application/json",
          "content-length": "999",
        });
        r.write('{"format":');
      },
    });
    const p = createSiteClient({ timeoutMs: SHORT }).fetchIndex(`${srv.url}/m`);
    const w = watch(p);
    await until(() => srv.requests.length === 1, "請求送達");
    clock.advance(SHORT - 1);
    assert.ok(await stillPending(w), "期限到之前不該結束");
    clock.advance(1);
    const v = await p;
    assert.equal(v.side, "unreachable");
    assert.equal(v.reason, "network");
    assert.equal(
      v.detail,
      summarizeManifestFetchFailure(new Error("aborted")).hint,
    );
  },
);

test(
  "classify: no headers at all ⇒ unreachable when the deadline passes, not before",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const clock = useMockClock(t);
    const srv = await site(t, { "/m": () => {} });
    const p = createSiteClient({ timeoutMs: SHORT }).fetchIndex(`${srv.url}/m`);
    const w = watch(p);
    await until(() => srv.requests.length === 1, "請求送達");
    clock.advance(SHORT - 1);
    assert.ok(await stillPending(w), "期限到之前不該結束");
    clock.advance(1);
    const v = await p;
    assert.equal(v.side, "unreachable");
  },
);

test("timeoutMs defaults to SITE_TIMEOUT_MS = 5000 (D11)", () => {
  assert.equal(SITE_TIMEOUT_MS, 5000);
  assert.equal(createSiteClient().timeoutMs, 5000);
});

// ── 索引與快取 ──

test("fetchIndex: ok value is the four URLs resolved against the manifest URL (D12)", async (t) => {
  const srv = await site(t, okSite);
  const r = await createSiteClient().fetchIndex(`${srv.url}/s/manifest.json`);
  assert.deepEqual(r, {
    side: "ok",
    value: {
      gate: `${srv.url}/s/gate.json`,
      notice: `${srv.url}/s/notice.json`,
      release: `${srv.url}/s/release.json`,
      files: `${srv.url}/s/files/`,
    },
  });
});

test("fetchIndex: a successful index is fetched only once per client", async (t) => {
  const srv = await site(t, okSite);
  const c = createSiteClient();
  await c.fetchIndex(`${srv.url}/s/manifest.json`);
  const second = await c.fetchIndex(`${srv.url}/s/manifest.json`);
  assert.equal(second.side, "ok");
  assert.equal(hits(srv, "/s/manifest.json"), 1);
});

test("fetchIndex: a failure is not cached — the next call really refetches", async (t) => {
  let n = 0;
  const srv = await site(t, {
    "/s/manifest.json": (q, r) =>
      ++n === 1 ? json(r, {}, 530) : json(r, INDEX),
  });
  const c = createSiteClient();
  assert.equal(
    (await c.fetchIndex(`${srv.url}/s/manifest.json`)).side,
    "unreachable",
  );
  assert.equal((await c.fetchIndex(`${srv.url}/s/manifest.json`)).side, "ok");
  assert.equal(hits(srv, "/s/manifest.json"), 2);
});

// ── fetchSite／fetchNotice ──

test("fetchSite: index unreachable or invalid ⇒ zero further requests, gate/release undefined", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    throw new Error("should not fetch");
  };
  const c = createSiteClient({ fetchImpl });
  for (const index of [
    { side: "unreachable", reason: "network", detail: "x" },
    { side: "invalid", reason: "http", detail: "HTTP 404", status: 404 },
  ]) {
    assert.deepEqual(await c.fetchSite(index), {
      gate: undefined,
      release: undefined,
    });
    assert.equal(await c.fetchNotice(index), null);
  }
  assert.equal(calls, 0);
});

test("fetchSite: all ok", async (t) => {
  const srv = await site(t, okSite);
  const c = createSiteClient();
  const s = await c.fetchSite(await c.fetchIndex(`${srv.url}/s/manifest.json`));
  assert.equal(s.gate.side, "ok");
  assert.equal(s.release.side, "ok");
  assert.equal(s.release.value.version, "GGL3.1.02");
});

test("fetchSite: a broken gate does not affect release", async (t) => {
  const srv = await site(t, {
    ...okSite,
    "/s/gate.json": (q, r) => json(r, { maintenance: 1 }),
  });
  const c = createSiteClient();
  const s = await c.fetchSite(await c.fetchIndex(`${srv.url}/s/manifest.json`));
  assert.equal(s.gate.side, "invalid");
  assert.equal(s.release.side, "ok");
});

test("fetchNotice: notice.json HTTP 500 ⇒ null", async (t) => {
  const srv = await site(t, {
    ...okSite,
    "/s/notice.json": (q, r) => json(r, {}, 500),
  });
  const c = createSiteClient();
  const index = await c.fetchIndex(`${srv.url}/s/manifest.json`);
  assert.equal(await c.fetchNotice(index), null);
  assert.equal(hits(srv, "/s/notice.json"), 1);
});

test("fetchNotice: all ok ⇒ notice and notifications", async (t) => {
  const srv = await site(t, okSite);
  const c = createSiteClient();
  const n = await c.fetchNotice(
    await c.fetchIndex(`${srv.url}/s/manifest.json`),
  );
  assert.equal(n.notice.title, "T");
  assert.deepEqual(n.notifications, [{ id: "n1" }]);
});

test("N30 fetchSite: notice.json is not requested; neither path returns a notice key", async (t) => {
  const srv = await site(t, okSite);
  const c = createSiteClient();
  const s = await c.fetchSite(await c.fetchIndex(`${srv.url}/s/manifest.json`));
  assert.equal(s.gate.side, "ok");
  assert.equal(s.release.side, "ok");
  assert.equal("notice" in s, false);
  assert.equal(hits(srv, "/s/notice.json"), 0);
  const miss = await c.fetchSite({
    side: "unreachable",
    reason: "network",
    detail: "x",
  });
  assert.equal("notice" in miss, false);
});

test("N30 fetchIndex: format 4 ⇒ side newer, gate/release never requested, not cached", async (t) => {
  const srv = await site(t, {
    ...okSite,
    "/s/manifest.json": (q, r) => json(r, { ...INDEX, format: 4 }),
  });
  const c = createSiteClient();
  const r = await c.fetchIndex(`${srv.url}/s/manifest.json`);
  assert.equal(r.side, "newer");
  assert.equal(r.reason, "format");
  assert.match(r.detail, /請下載新版啟動器/);
  assert.deepEqual(await c.fetchSite(r), {
    gate: undefined,
    release: undefined,
  });
  assert.equal(hits(srv, "/s/gate.json"), 0);
  assert.equal(hits(srv, "/s/release.json"), 0);
  assert.equal(
    (await c.fetchIndex(`${srv.url}/s/manifest.json`)).side,
    "newer",
  );
  assert.equal(hits(srv, "/s/manifest.json"), 2);
});

test("N30 fetchIndex: an error thrown while validating (relative manifest URL) ⇒ invalid, not a rejection", async () => {
  const fetchImpl = async () => ({
    status: 200,
    text: async () => JSON.stringify(INDEX),
    headers: { get: () => "application/json" },
  });
  const r = await createSiteClient({ fetchImpl }).fetchIndex("manifest.json");
  assert.equal(r.side, "invalid");
  assert.match(r.detail, /^驗證時發生錯誤：/);
});

test("fetchNotice: does not request release", async (t) => {
  const srv = await site(t, okSite);
  const c = createSiteClient();
  await c.fetchNotice(await c.fetchIndex(`${srv.url}/s/manifest.json`));
  assert.equal(hits(srv, "/s/release.json"), 0);
  assert.equal(hits(srv, "/s/notice.json"), 1);
});

test(
  "fetchNotice: logUrl stalls ⇒ returns when the deadline passes, other fields intact, log empty",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const clock = useMockClock(t);
    const srv = await site(t, {
      ...okSite,
      "/s/notice.json": (q, r) =>
        json(r, {
          notice: { title: "T", logUrl: `http://${q.headers.host}/log` },
        }),
      "/log": (q, r) => {
        r.writeHead(200, { "content-length": "999" });
        r.write("line1\n");
      },
    });
    const c = createSiteClient({ timeoutMs: SHORT });
    const index = await c.fetchIndex(`${srv.url}/s/manifest.json`);
    const p = c.fetchNotice(index);
    const w = watch(p);
    await until(() => hits(srv, "/log") === 1, "logUrl 請求送達");
    clock.advance(SHORT - 1);
    assert.ok(await stillPending(w), "logUrl 的期限到之前不該結束");
    clock.advance(1);
    const v = await p;
    assert.equal(v.notice.title, "T");
    assert.deepEqual(v.notice.log, []);
  },
);

test("fetchNotice: inline log present ⇒ logUrl not requested", async (t) => {
  const srv = await site(t, {
    ...okSite,
    "/s/notice.json": (q, r) =>
      json(r, {
        notice: {
          title: "T",
          log: ["a"],
          logUrl: `http://${q.headers.host}/log`,
        },
      }),
    "/log": (q, r) => (r.writeHead(200), r.end("remote")),
  });
  const c = createSiteClient();
  const v = await c.fetchNotice(
    await c.fetchIndex(`${srv.url}/s/manifest.json`),
  );
  assert.deepEqual(v.notice.log, ["a"]);
  assert.equal(hits(srv, "/log"), 0);
});

test("fetchNotice: logUrl is not refetched within 60 s", async (t) => {
  const srv = await site(t, {
    ...okSite,
    "/s/notice.json": (q, r) =>
      json(r, {
        notice: { title: "T", logUrl: `http://${q.headers.host}/log` },
      }),
    "/log": (q, r) => (r.writeHead(200), r.end("x\ny")),
  });
  const c = createSiteClient();
  const index = await c.fetchIndex(`${srv.url}/s/manifest.json`);
  const first = await c.fetchNotice(index);
  const second = await c.fetchNotice(index);
  assert.deepEqual(first.notice.log, ["x", "y"]);
  assert.deepEqual(second.notice.log, ["x", "y"]);
  assert.equal(hits(srv, "/log"), 1);
  assert.equal(hits(srv, "/s/notice.json"), 2);
});

// ── logUrl 抓失敗沿用上一次成功的（③b-2 R6） ──

/** /log 的行為由 logMode.value 決定：ok（回 lines）、500、stall（只送一半） */
async function logSite(t, logMode) {
  return site(t, {
    ...okSite,
    "/s/notice.json": (q, r) =>
      json(r, {
        notice: { title: "T", logUrl: `http://${q.headers.host}/log` },
      }),
    "/log": (q, r) => {
      if (logMode.value === "500") return json(r, {}, 500);
      if (logMode.value === "stall") {
        r.writeHead(200, { "content-length": "999" });
        return r.write("half\n");
      }
      r.writeHead(200);
      r.end(logMode.lines.join("\n"));
    },
  });
}

const LOG_EXPIRE_MS = 60_001; // site-client 的 log 快取是 60 秒

test("L1 logUrl ok once, cache expired, then 500 ⇒ previous lines", async (t) => {
  useMockClock(t);
  const logMode = { value: "ok", lines: ["x", "y"] };
  const srv = await logSite(t, logMode);
  let clock = 1_000_000;
  const c = createSiteClient({ timeoutMs: SHORT, now: () => clock });
  const index = await c.fetchIndex(`${srv.url}/s/manifest.json`);
  assert.deepEqual((await c.fetchNotice(index)).notice.log, ["x", "y"]);
  await c.fetchNotice(index); // 注入的時鐘沒前進 ⇒ 用快取、不重抓
  assert.equal(hits(srv, "/log"), 1);
  clock += LOG_EXPIRE_MS;
  logMode.value = "500";
  assert.deepEqual((await c.fetchNotice(index)).notice.log, ["x", "y"]);
  assert.equal(hits(srv, "/log"), 2);
});

test(
  "L2 logUrl ok once, cache expired, then stalls past the deadline ⇒ previous lines",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const mock = useMockClock(t);
    const logMode = { value: "ok", lines: ["x", "y"] };
    const srv = await logSite(t, logMode);
    let clock = 1_000_000;
    const c = createSiteClient({ timeoutMs: SHORT, now: () => clock });
    const index = await c.fetchIndex(`${srv.url}/s/manifest.json`);
    await c.fetchNotice(index);
    clock += LOG_EXPIRE_MS;
    logMode.value = "stall";
    const p = c.fetchNotice(index);
    await until(() => hits(srv, "/log") === 2, "第二次 logUrl 請求送達");
    mock.advance(SHORT); // 停住 ⇒ 期限到、沿用上一次的
    assert.deepEqual((await p).notice.log, ["x", "y"]);
    assert.equal(hits(srv, "/log"), 2);
  },
);

test("L3 after falling back, the next call refetches; success replaces the lines", async (t) => {
  useMockClock(t);
  const logMode = { value: "ok", lines: ["x", "y"] };
  const srv = await logSite(t, logMode);
  let clock = 1_000_000;
  const c = createSiteClient({ timeoutMs: SHORT, now: () => clock });
  const index = await c.fetchIndex(`${srv.url}/s/manifest.json`);
  await c.fetchNotice(index);
  clock += LOG_EXPIRE_MS;
  logMode.value = "500";
  await c.fetchNotice(index); // 沿用；快取時間不更新
  logMode.value = "ok";
  logMode.lines = ["new"];
  assert.deepEqual((await c.fetchNotice(index)).notice.log, ["new"]);
  assert.equal(hits(srv, "/log"), 3);
});

test("L4 logUrl never succeeded and returns 500 ⇒ empty log", async (t) => {
  useMockClock(t);
  const srv = await logSite(t, { value: "500", lines: [] });
  const c = createSiteClient({ timeoutMs: SHORT });
  const index = await c.fetchIndex(`${srv.url}/s/manifest.json`);
  const v = await c.fetchNotice(index);
  assert.equal(v.notice.title, "T");
  assert.deepEqual(v.notice.log, []);
});

test(
  "non-2xx with a body that never ends ⇒ classified, and the connection is released",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    useMockClock(t);
    let released = false;
    const srv = await site(t, {
      "/m": (q, r) => {
        r.on("close", () => (released = true));
        r.writeHead(404, { "content-length": "999" });
        r.write("not found, and still sending");
      },
    });
    const v = await createSiteClient({ timeoutMs: SHORT }).fetchIndex(
      `${srv.url}/m`,
    );
    assert.equal(v.side, "invalid");
    // 原本是真時間 1000 ms 的賽跑；改成等事件，等不到就紅（until 的訊息）
    await until(() => released, "未讀的 body 沒被丟掉，連線一直掛著");
    assert.equal(released, true);
  },
);
