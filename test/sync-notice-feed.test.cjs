"use strict";

// 公告輪詢模組；規格 → _notes/plans/instance-sync-v3-commit3b2a.md §介面「notice-feed」、R2、R6、R7

const test = require("node:test");
const assert = require("node:assert/strict");

const { createNoticeFeed } = require("../main/sync/notice-feed.js");
const { createSiteClient } = require("../main/sync/site-client.js");
const { startServer } = require("./helpers/local-http.cjs");

const URL_A = "https://ggl.test/a/manifest.json";
const URL_B = "https://ggl.test/b/manifest.json";
const NOW = Date.parse("2030-01-01T00:00:00Z");
const OK_INDEX = { side: "ok", value: { notice: "notice.json" } };
const DOWN_INDEX = { side: "unreachable", reason: "network", detail: "x" };

const NOTE = {
  title: "公告",
  subtitle: "",
  imageUrl: "",
  logUrl: "",
  log: ["l1"],
};
const N_A = {
  id: "a",
  title: "A",
  body: "a",
  createdAt: "2029-12-31T00:00:00Z",
};
const N_B = {
  id: "b",
  title: "B",
  body: "b",
  createdAt: "2029-12-30T00:00:00Z",
  expiresAt: "2030-01-01T01:00:00Z",
};
const N_C = {
  id: "c",
  title: "C",
  body: "c",
  startsAt: "2030-02-01T00:00:00Z",
};
// normalizeBroadcastNotifications 的輸出（寫死，不由被測程式算）
const ITEM_A = {
  id: "a",
  title: "A",
  body: "a",
  timeText: "",
  priority: 0,
  createdAtMs: Date.parse("2029-12-31T00:00:00Z"),
  key: `${Date.parse("2029-12-31T00:00:00Z")}:a`,
};
const ITEM_B = {
  id: "b",
  title: "B",
  body: "b",
  timeText: "",
  priority: 0,
  createdAtMs: Date.parse("2029-12-30T00:00:00Z"),
  key: `${Date.parse("2029-12-30T00:00:00Z")}:b`,
};

/** 假 siteClient：回應放在可改的欄位；值是函式 ⇒ 呼叫它（可丟錯） */
function fakeSiteClient() {
  const sc = {
    calls: { fetchIndex: [], fetchNotice: [] },
    index: OK_INDEX,
    notice: { notice: NOTE, notifications: [N_A] },
    async fetchIndex(url) {
      sc.calls.fetchIndex.push(url);
      return typeof sc.index === "function" ? sc.index() : sc.index;
    },
    async fetchNotice(index) {
      sc.calls.fetchNotice.push(index);
      return typeof sc.notice === "function" ? sc.notice() : sc.notice;
    },
  };
  return sc;
}

/** 假計時器：只記 set*（種類與毫秒），可手動觸發 */
function fakeTimers() {
  const log = [];
  const active = new Map();
  let id = 0;
  const add = (kind, fn, ms) => {
    log.push([kind === "timeout" ? "setTimeout" : "setInterval", ms]);
    active.set(++id, { kind, fn });
    return id;
  };
  return {
    log,
    active,
    setTimeout: (fn, ms) => add("timeout", fn, ms),
    setInterval: (fn, ms) => add("interval", fn, ms),
    clearTimeout: (h) => active.delete(h),
    clearInterval: (h) => active.delete(h),
    fire(kind) {
      for (const [h, t] of [...active]) {
        if (t.kind !== kind) continue;
        if (kind === "timeout") active.delete(h);
        t.fn();
      }
    },
  };
}

function setup(over = {}) {
  const sc = over.siteClient ?? fakeSiteClient();
  const changes = [];
  const logged = [];
  const clock = { now: NOW };
  const serverConfig = over.serverConfig ?? { manifestUrl: URL_A };
  const timers = over.timers ?? fakeTimers();
  const feed = createNoticeFeed({
    siteClient: sc,
    onChange: over.onChange ?? ((s) => changes.push(s)),
    serverConfig,
    log: over.log ?? ((e) => logged.push(e)),
    timers,
    now: () => clock.now,
    ...(over.pollMs !== undefined ? { pollMs: over.pollMs } : {}),
    ...(over.firstDelayMs !== undefined
      ? { firstDelayMs: over.firstDelayMs }
      : {}),
  });
  return { feed, sc, changes, logged, clock, serverConfig, timers };
}

const flush = () => new Promise((r) => setImmediate(r));

test("F1 missing siteClient or onChange ⇒ TypeError naming the key", () => {
  const base = { siteClient: fakeSiteClient(), onChange: () => {} };
  assert.doesNotThrow(() => createNoticeFeed(base));
  for (const key of ["siteClient", "onChange"]) {
    const absent = { ...base };
    delete absent[key];
    for (const deps of [absent, { ...base, [key]: undefined }]) {
      assert.throws(
        () => createNoticeFeed(deps),
        (e) => e instanceof TypeError && e.message.includes(key),
        key,
      );
    }
  }
});

test("F2 not configured ⇒ no fetch, state untouched; re-read on every refresh", async () => {
  const fresh = setup({ serverConfig: { manifestUrl: "" } });
  await fresh.feed.refresh();
  assert.equal(fresh.sc.calls.fetchIndex.length, 0);
  assert.equal(fresh.sc.calls.fetchNotice.length, 0);
  assert.deepEqual(fresh.feed.get(), { notice: null, notifications: [] });

  const { feed, sc, changes, serverConfig } = setup();
  await feed.refresh();
  const after = feed.get();
  serverConfig.manifestUrl = "";
  await feed.refresh();
  assert.equal(sc.calls.fetchIndex.length, 1);
  assert.deepEqual(feed.get(), after);
  assert.equal(changes.length, 1);
  serverConfig.manifestUrl = URL_A;
  await feed.refresh();
  assert.equal(sc.calls.fetchIndex.length, 2);
});

test("F3 first success with a notice and a notification ⇒ onChange once with get()", async () => {
  const { feed, changes } = setup();
  await feed.refresh();
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0], { notice: NOTE, notifications: [ITEM_A] });
  assert.deepEqual(changes[0], feed.get());
});

test("F4 same content again ⇒ onChange not called again", async () => {
  const { feed, changes } = setup();
  await feed.refresh();
  await feed.refresh();
  assert.equal(changes.length, 1);
});

test("F5 index unreachable after a success ⇒ previous content kept (R2)", async () => {
  const { feed, sc, changes } = setup();
  await feed.refresh();
  const before = feed.get();
  sc.index = DOWN_INDEX;
  await feed.refresh();
  assert.deepEqual(feed.get(), before);
  assert.equal(changes.length, 1);
});

test("F6 fetchNotice returns null after a success ⇒ previous content kept (R2)", async () => {
  const { feed, sc, changes } = setup();
  await feed.refresh();
  const before = feed.get();
  sc.notice = null;
  await feed.refresh();
  assert.deepEqual(feed.get(), before);
  assert.equal(changes.length, 1);
});

test("F7 readable but empty ⇒ cleared once; empty on the first success ⇒ no onChange", async () => {
  const { feed, sc, changes } = setup();
  await feed.refresh();
  sc.notice = { notice: null, notifications: [] };
  await feed.refresh();
  assert.deepEqual(feed.get(), { notice: null, notifications: [] });
  assert.equal(changes.length, 2);
  assert.deepEqual(changes[1], { notice: null, notifications: [] });

  const empty = setup();
  empty.sc.notice = { notice: null, notifications: [] };
  await empty.feed.refresh();
  assert.equal(empty.changes.length, 0);
});

test("F8 get() returns whole normalized items and re-filters by now() without refresh", async () => {
  const { feed, sc, clock } = setup();
  sc.notice = { notice: NOTE, notifications: [N_B, N_C, N_A] };
  await feed.refresh();
  assert.deepEqual(feed.get().notifications, [ITEM_A, ITEM_B]);
  clock.now = Date.parse("2030-01-01T02:00:00Z");
  assert.deepEqual(feed.get().notifications, [ITEM_A]);
});

test("F9 a notification expires between two successes with identical raw content ⇒ onChange", async () => {
  const { feed, sc, changes, clock } = setup();
  sc.notice = { notice: NOTE, notifications: [N_A, N_B] };
  await feed.refresh();
  clock.now = Date.parse("2030-01-01T02:00:00Z");
  await feed.refresh();
  assert.equal(changes.length, 2);
  assert.deepEqual(changes[1].notifications, [ITEM_A]);
});

test("F10 concurrent refresh() calls share one promise and one fetch", async () => {
  const { feed, sc } = setup();
  const p1 = feed.refresh();
  const p2 = feed.refresh();
  assert.equal(p1, p2);
  await p1;
  assert.equal(sc.calls.fetchIndex.length, 1);
});

test("F11 fetchIndex or fetchNotice throws ⇒ resolves, state kept, error logged (R7)", async () => {
  for (const which of ["index", "notice"]) {
    const { feed, sc, logged } = setup();
    await feed.refresh();
    const before = feed.get();
    const boom = new Error(`boom-${which}`);
    sc[which] = () => {
      throw boom;
    };
    await feed.refresh();
    assert.deepEqual(feed.get(), before, which);
    assert.deepEqual(logged, [boom], which);
  }
});

test("F12 onChange throws ⇒ resolves, state updated, logged, not resent; log throwing is swallowed", async () => {
  const boom = new Error("onChange boom");
  let calls = 0;
  const { feed, logged } = setup({
    onChange: () => {
      calls += 1;
      throw boom;
    },
  });
  await feed.refresh();
  assert.deepEqual(feed.get().notice, NOTE);
  assert.deepEqual(logged, [boom]);
  await feed.refresh();
  assert.equal(calls, 1);

  const noisy = setup({
    onChange: () => {
      throw boom;
    },
    log: () => {
      throw new Error("log boom");
    },
  });
  await assert.doesNotReject(noisy.feed.refresh());
});

test("F13 start/stop register and clear the timers; each tick refreshes once", async () => {
  const { feed, sc, timers } = setup({ pollMs: 500, firstDelayMs: 50 });
  feed.start();
  feed.start();
  assert.deepEqual(timers.log, [
    ["setTimeout", 50],
    ["setInterval", 500],
  ]);
  timers.fire("timeout");
  await flush();
  assert.equal(sc.calls.fetchIndex.length, 1);
  timers.fire("interval");
  await flush();
  assert.equal(sc.calls.fetchIndex.length, 2);
  feed.stop();
  assert.equal(timers.active.size, 0);

  const early = setup({ pollMs: 500, firstDelayMs: 50 });
  early.feed.start();
  early.feed.stop();
  assert.equal(early.timers.active.size, 0);
  early.timers.fire("timeout");
  early.timers.fire("interval");
  await flush();
  assert.equal(early.sc.calls.fetchIndex.length, 0);
  early.feed.start();
  assert.deepEqual(early.timers.log, [
    ["setTimeout", 50],
    ["setInterval", 500],
    ["setTimeout", 50],
    ["setInterval", 500],
  ]);
  early.feed.stop();
});

test("F14 default timings are 1200 ms first, then every 30000 ms", () => {
  const { feed, timers } = setup();
  feed.start();
  assert.deepEqual(timers.log, [
    ["setTimeout", 1200],
    ["setInterval", 30000],
  ]);
  feed.stop();
});

test("F15 manifestUrl changed between refreshes ⇒ fetchIndex receives each URL in turn", async () => {
  const { feed, sc, serverConfig } = setup();
  await feed.refresh();
  serverConfig.manifestUrl = URL_B;
  await feed.refresh();
  assert.deepEqual(sc.calls.fetchIndex, [URL_A, URL_B]);
});

// ── 接真的 site-client（守 fetchNotice 的介面沒漂移；R6） ──

async function realSite(t, state) {
  const srv = await startServer((req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.url === "/s/manifest.json") {
      return send(200, {
        format: 3,
        gate: "gate.json",
        notice: "notice.json",
        release: "release.json",
        files: "files/",
      });
    }
    if (req.url === "/s/notice.json") {
      if (state.notice500) return send(500, {});
      return send(200, state.noticeDoc(req.headers.host));
    }
    if (req.url === "/log") {
      if (state.log500) return send(500, {});
      res.writeHead(200);
      return res.end(state.logLines.join("\n"));
    }
    send(404, {});
  });
  t.after(() => srv.close());
  return srv;
}

test("F16 real site-client: notice.json 500 keeps, recovery updates; logUrl 500 after expiry keeps the log (R6)", async (t) => {
  const state = {
    notice500: false,
    log500: false,
    logLines: [],
    noticeDoc: () => ({ notice: { title: "T1" }, notifications: [] }),
  };
  const srv = await realSite(t, state);
  const { feed, changes } = setup({
    siteClient: createSiteClient({ timeoutMs: 1000 }),
    serverConfig: { manifestUrl: `${srv.url}/s/manifest.json` },
  });
  await feed.refresh();
  assert.equal(feed.get().notice.title, "T1");
  state.notice500 = true;
  await feed.refresh();
  assert.equal(feed.get().notice.title, "T1");
  assert.equal(changes.length, 1);
  state.notice500 = false;
  state.noticeDoc = () => ({ notice: { title: "T2" }, notifications: [] });
  await feed.refresh();
  assert.equal(feed.get().notice.title, "T2");
  assert.equal(changes.length, 2);

  let clock = 1_000_000;
  const logState = {
    notice500: false,
    log500: false,
    logLines: ["x", "y"],
    noticeDoc: (host) => ({
      notice: { title: "L", logUrl: `http://${host}/log` },
      notifications: [],
    }),
  };
  const logSrv = await realSite(t, logState);
  const withLog = setup({
    siteClient: createSiteClient({ timeoutMs: 1000, now: () => clock }),
    serverConfig: { manifestUrl: `${logSrv.url}/s/manifest.json` },
  });
  await withLog.feed.refresh();
  assert.deepEqual(withLog.feed.get().notice.log, ["x", "y"]);
  clock += 60_001;
  logState.log500 = true;
  await withLog.feed.refresh();
  assert.deepEqual(withLog.feed.get().notice.log, ["x", "y"]);
  assert.equal(withLog.changes.length, 1);
  assert.equal(
    logSrv.requests.filter((r) => r.url === "/log").length,
    2,
    "快取過期後真的重抓了 log",
  );
});
