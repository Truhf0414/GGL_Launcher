"use strict";

// 同步中樞（main/sync/index.js）整合測試：真 site-client／planSync／applyPlan／記錄讀寫＋暫存根目錄＋本機假站台。
// 案例清單的權威＝_notes/plans/instance-sync-v3.md §commit ③b-1b §測試案例（U1–U18）
// ＋ instance-sync-v3-commit3b1b.md §測試（寫法調整與 N1–N25）。

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
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
const { snapshot } = require("./helpers/fs-snapshot.cjs");
const { getPaths } = require("../lib/paths-layout.js");
const { windowsEnv } = require("../lib/launch-args.js");
const realServerConfig = require("../lib/server-config.js");
const {
  readRecord,
  writeRecord,
  markInProgress,
  isInProgress,
} = require("../main/sync/instance-record.js");
// N6：寫記錄與標記的函式多收 { log }（→ _notes/plans/cross-review-2026-10-n6.md §日誌傳遞與簽名）
const NO_LOG = { log: () => {} };
const { createSiteClient } = require("../main/sync/site-client.js");
const { applyPlan: realApplyPlan } = require("../main/sync/apply.js");
const { createInstanceSync } = require("../main/sync/index.js");
const { makeRuntimeProbe } = require("../main/sync/runtime-probe.js");
const { RUNTIME, LAUNCH_ID, installRuntime, runtimeFileRels } = require("./helpers/installed-runtime.cjs");
const { bridgeWithLiveWindow, throwOnSend } = require("./helpers/real-bridge.cjs");
const { describeProgress } = require("../lib/sync/status-text.js");

const HANG_LIMIT_MS = 10_000;
const LAUNCHER_VERSION = "1.0.0";
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const MOD_A = Buffer.from("mod A ".repeat(200));
const MOD_A2 = Buffer.from("mod A v2 ".repeat(200));
const MOD_B = Buffer.from("mod B ".repeat(300));
const MOD_B2 = Buffer.from("mod B v2 ".repeat(300));
const MOD_OLD = Buffer.from("old mod ".repeat(100));
const CONF = Buffer.from("config C ".repeat(50));
const BLOBS = new Map(
  [MOD_A, MOD_A2, MOD_B, MOD_B2, MOD_OLD, CONF].map((b) => [sha(b), b]),
);

const entry = (p, buf) => ({ path: p, sha256: sha(buf), size: buf.length });

function makeRelease(version, entries, { playerEditable = ["config/"] } = {}) {
  return {
    version,
    publishedAt: "2026-10-06T00:00:00.000Z",
    minecraft: "1.21.11",
    loader: { type: "fabric", version: "0.19.3" },
    playerEditable,
    files: entries,
  };
}
const REL_1 = makeRelease("1.0", [
  entry("mods/a.jar", MOD_A),
  entry("mods/b.jar", MOD_B),
  entry("config/c.json", CONF),
]);
const REL_2 = makeRelease("2.0", [
  entry("mods/a.jar", MOD_A),
  entry("mods/b.jar", MOD_B2),
  entry("config/c.json", CONF),
]);
// 兩個 mod 都和 REL_1 不同：下載時第一個成功、第二個才輪到（N20 要先收到套用的進度）
const REL_3 = makeRelease("3.0", [
  entry("mods/a.jar", MOD_A2),
  entry("mods/b.jar", MOD_B2),
  entry("config/c.json", CONF),
]);
// 比 REL_1 多一個 mod：裝的是它、站台換回 REL_1 ⇒ old.jar 列進刪除
const REL_OLD = makeRelease("0.9", [
  ...REL_1.files,
  entry("mods/old.jar", MOD_OLD),
]);
const INDEX = {
  format: 3,
  gate: "gate.json",
  notice: "notice.json",
  release: "release.json",
  files: "files/",
};

const recordFiles = (rel) =>
  rel.files.map((f) => ({ path: f.path, sha256: f.sha256 }));

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

const abs = (paths, rel) => path.join(paths.gameDir, ...rel.split("/"));
async function put(paths, rel, content) {
  await fsp.mkdir(path.dirname(abs(paths, rel)), { recursive: true });
  await fsp.writeFile(abs(paths, rel), content);
}

/**
 * 把一份 release 的檔案、記錄（含 ④c 起的 runtime 三欄）與 runtime 放到本機，當成之前裝好的樣子。
 * java: false ⇒ runtime 不裝（就緒走預設 probe、真的檔案系統，④c C12）
 */
async function install(paths, { release, java = true }) {
  for (const f of release.files) await put(paths, f.path, BLOBS.get(f.sha256));
  await writeRecord(paths, {
    format: 3,
    version: release.version,
    appliedAt: "2026-10-01T00:00:00.000Z",
    files: recordFiles(release),
    ...RUNTIME,
  }, NO_LOG);
  if (java) await installRuntime(paths);
}

// 中樞從頭到尾不碰公告（R3）：整個檔跑完必須是 0（N18，最後一個案例斷言）
let noticeRequests = 0;

/** 假站台：內容放在 site 物件裡，案例中途可改；site.respond(req, res) 回 true 表示自己回了 */
async function startSite(t, site) {
  const srv = await startServer((req, res) => {
    if (req.url === "/notice.json") noticeRequests++;
    if (site.respond?.(req, res)) return;
    const json = {
      "/manifest.json": site.index,
      "/gate.json": site.gate,
      "/release.json": site.release,
      "/notice.json": site.notice,
    }[req.url];
    if (json !== undefined) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(json));
      return;
    }
    const m = /^\/files\/([0-9a-f]{64})$/.exec(req.url);
    const body = m && site.blobs.get(m[1]);
    if (body) {
      serveWithRange(req, res, body);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  t.after(() => srv.close());
  return srv;
}

const isUnder = (child, parent) => {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

/**
 * 每個案例一個新的根目錄、假站台、site-client 與中樞。
 * @param {{ installed?: object, site?: object, deps?: object, config?: object, timeoutMs?: number }} [opts]
 */
async function setup(
  t,
  { installed, site: siteOver, deps: depsOver, config, timeoutMs } = {},
) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-hub-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const settings = { launcherRootDir: root };
  const paths = getPaths(settings);
  // 漏注入時的預設是真站台與 C:\Games\GGL：先確認這次一定落在暫存區
  assert.ok(
    isUnder(paths.root, os.tmpdir()),
    `測試根目錄不在暫存區：${paths.root}`,
  );

  const site = {
    index: { ...INDEX },
    gate: {},
    release: REL_1,
    notice: { notice: null, notifications: [] },
    blobs: new Map(BLOBS),
    ...siteOver,
  };
  const srv = await startSite(t, site);

  // 不看時鐘的閘：指定某支檔的第 n 個請求，在回應讀完之後等測試放行（先起的那次已拿到舊資料才有意義）
  const fetchCounts = new Map();
  const holds = [];
  const fetchImpl = async (url, opts) => {
    const file = new URL(url).pathname;
    const n = (fetchCounts.get(file) ?? 0) + 1;
    fetchCounts.set(file, n);
    const res = await fetch(url, opts);
    const hold = holds.find((x) => x.file === file && x.n === n);
    if (!hold) return res;
    const body = await res.text();
    hold.reached.resolve();
    await hold.go.promise;
    return new Response(body, { status: res.status, headers: res.headers });
  };
  const holdFetch = (file, n) => {
    const hold = { file, n, reached: deferred(), go: deferred() };
    holds.push(hold);
    t.after(() => hold.go.resolve());
    return hold;
  };
  const fetchCount = (file) => fetchCounts.get(file) ?? 0;

  const client = createSiteClient(
    timeoutMs === undefined ? { fetchImpl } : { fetchImpl, timeoutMs },
  );
  const counts = { fetchIndex: 0, fetchSite: 0 };
  const siteClient = {
    ...client,
    fetchIndex: (...a) => {
      counts.fetchIndex++;
      return client.fetchIndex(...a);
    },
    fetchSite: (...a) => {
      counts.fetchSite++;
      return client.fetchSite(...a);
    },
  };

  const calls = { applyPlan: [], prepareRuntime: [], confirmGameClosed: 0 };
  const sent = [];
  const logs = [];
  const hooks = {}; // beforeApply(input)：在轉給真的 applyPlan 之前執行，可卡住或丟錯
  const deps = {
    readSettings: async () => settings,
    isMinecraftRunning: () => false,
    log: (line) => logs.push(line),
    // 假的 runtime 安裝：把 fixture 那套寫到磁碟，回 release 要的三欄（真的管線在 ④b 測）
    prepareRuntime: async (arg) => {
      calls.prepareRuntime.push(arg);
      await installRuntime(arg.paths);
      return { minecraft: arg.minecraft, loader: { ...arg.loader }, javaMajor: RUNTIME.javaMajor };
    },
    sendInstanceStatus: (s) => sent.push(s),
    confirmGameClosed: async () => {
      calls.confirmGameClosed++;
      return false;
    },
    launcherVersion: LAUNCHER_VERSION,
    serverConfig: {
      manifestUrl: `${srv.url}/manifest.json`,
      protectedPaths: realServerConfig.protectedPaths,
      ...config,
    },
    siteClient,
    applyPlan: async (input) => {
      calls.applyPlan.push(input);
      await hooks.beforeApply?.(input);
      return realApplyPlan(input);
    },
    runPowerShell: async () => ({ code: 0, stdout: "" }),
    onProgress: () => {}, // 必填（6b-3b，M-DI #8）；要看進度的案例用 depsOver 換掉
    ...depsOver,
  };
  if (installed) await install(paths, installed);
  const sync = createInstanceSync(deps);
  return {
    sync,
    deps,
    settings,
    paths,
    site,
    srv,
    sent,
    calls,
    logs,
    counts,
    hooks,
    holdFetch,
    fetchCount,
    last: () => sent.at(-1),
  };
}

/** 架子自己出錯會被接成 internal-error：失敗訊息帶出原因那兩欄 */
function assertKind(status, kind) {
  assert.equal(
    status?.kind,
    kind,
    `kind 應為 ${kind}，實際 ${status?.kind}；errorTexts=${JSON.stringify(status?.errorTexts)}；errorDetail=${status?.errorDetail}`,
  );
}

const isCode = (code) => (e) => {
  assert.equal(
    e?.code,
    code,
    `code 應為 ${code}，實際 ${e?.code}：${e?.message}`,
  );
  return true;
};

test(
  "U2 兩次 update 同時 ⇒ 第二、三次 GGL_SYNC_BUSY、不多送狀態，第一次照常完成",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const h = await setup(t, {
      installed: { release: REL_1 },
      site: { release: REL_2 },
    });
    const entered = deferred();
    const go = deferred();
    t.after(() => go.resolve());
    h.hooks.beforeApply = async () => {
      entered.resolve();
      await go.promise;
    };

    const first = h.sync.updateInstance();
    await entered.promise;
    const sentBefore = h.sent.length;
    await assert.rejects(h.sync.updateInstance(), isCode("GGL_SYNC_BUSY"));
    assert.equal(h.sent.length, sentBefore, "撞鎖那次不送狀態");
    assert.equal(h.sync.getLockHolder(), "update");
    await assert.rejects(h.sync.updateInstance(), isCode("GGL_SYNC_BUSY"));

    go.resolve();
    assert.deepEqual(await first, { movedAside: [] });
    assert.equal(h.sync.getLockHolder(), null);
    assert.equal(h.calls.applyPlan.length, 1);
    assertKind(h.last(), "up-to-date");
  },
);

test("U11 kind 為 update-available 時 updateInstance ⇒ 真的呼叫 applyPlan、裝上新版", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  assertKind(await h.sync.getInstanceStatus(), "update-available");

  await h.sync.updateInstance();

  assert.equal(h.calls.applyPlan.length, 1);
  const rec = await readRecord(h.paths);
  assert.equal(rec.version, "2.0");
  assert.deepEqual(await fsp.readFile(abs(h.paths, "mods/b.jar")), MOD_B2);
  assertKind(h.last(), "up-to-date");
});

test("U18 沒有記錄時的安裝走 repairInstance ⇒ 記錄等於 release、localVersion 等於它", async (t) => {
  const h = await setup(t, { site: { release: REL_1 } });
  assertKind(await h.sync.getInstanceStatus(), "not-installed");

  await h.sync.repairInstance();

  const rec = await readRecord(h.paths);
  assert.equal(rec.version, REL_1.version);
  assert.deepEqual(rec.files, recordFiles(REL_1));
  assertKind(h.last(), "up-to-date");
  assert.equal(h.last().localVersion, REL_1.version);
});

// ── 狀態 ──

const STATUS_KEYS = [
  "kind",
  "localReady",
  "ui",
  "allowed",
  "syncReasons",
  "errorTexts",
  "errorDetail",
  "gateMessages",
  "localVersion",
  "remoteVersion",
];
const MAINTENANCE_GATE = {
  maintenance: { enabled: true, message: "維修中測試" },
};
const respond503 = (file) => (req, res) => {
  if (req.url !== file) return false;
  res.writeHead(503);
  res.end();
  return true;
};
const respondBody = (file, status, body) => (req, res) => {
  if (req.url !== file) return false;
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body);
  return true;
};
// 型別錯 ⇒ site-client 判 invalid（D-GATE：不准安裝、更新、修復，就緒仍可啟動）
const BAD_GATE = { maintenance: { enabled: "yes" } };

test("U6 啟動持鎖期間呼叫 getInstanceStatus ⇒ kind 不是 syncing", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  await h.sync.withLaunchLock(async () => {
    assert.equal(h.sync.getLockHolder(), "launch");
    assertKind(await h.sync.getInstanceStatus(), "up-to-date");
  });
});

test(
  "U8 畫面用的計算：先起的那次故意晚回 ⇒ 送出的是後起那次的結果",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const h = await setup(t, { installed: { release: REL_1 } });
    const hold = h.holdFetch("/release.json", 1);
    const early = h.sync.getInstanceStatus();
    await hold.reached.promise;

    h.site.release = REL_2;
    assertKind(await h.sync.getInstanceStatus(), "update-available");
    hold.go.resolve();
    assertKind(await early, "up-to-date");

    assert.equal(h.sent.length, 1, "晚到的那次被丟掉");
    assertKind(h.last(), "update-available");
  },
);

// 原本還跑 example.com 佔位那一輪：佔位範本早已不存在，那條退路已刪（→ _notes/plans/cross-review-2026-10-phase6c.md U4）
test("N12 沒設定更新來源 ⇒ unconfigured、站台一次都沒抓", async (t) => {
  for (const manifestUrl of [""]) {
    const h = await setup(t, { installed: { release: REL_1 } });
    h.deps.serverConfig.manifestUrl = manifestUrl;
    const sync = createInstanceSync(h.deps);
    const s = await sync.getInstanceStatus();
    assertKind(s, "unconfigured");
    assert.equal(h.counts.fetchIndex, 0, manifestUrl);
    assert.equal(h.counts.fetchSite, 0, manifestUrl);
    assert.deepEqual(h.last(), s);
  }
});

const UNREADABLE_CASES = [
  {
    name: "甲 sync-record.json 是資料夾",
    file: (paths) => paths.syncRecordPath,
    arrange: async (t, h) =>
      fsp.mkdir(h.paths.syncRecordPath, { recursive: true }),
  },
  {
    name: "乙 標記的 stat 丟 EACCES",
    file: (paths) => paths.syncInProgressPath,
    installed: { release: REL_1 },
    arrange: async (t, h) => {
      const realStat = fsp.stat;
      t.mock.method(fsp, "stat", async function (p, ...rest) {
        if (p === h.paths.syncInProgressPath) {
          throw Object.assign(
            new Error(`EACCES: permission denied, stat '${p}'`),
            { code: "EACCES", syscall: "stat", path: p },
          );
        }
        return realStat.call(this, p, ...rest);
      });
    },
  },
];

async function setupUnreadable(t, c, opts = {}) {
  const h = await setup(t, { installed: c.installed, ...opts });
  await c.arrange(t, h);
  return h;
}

for (const c of UNREADABLE_CASES) {
  test(`N13 local-unreadable（${c.name}）⇒ 狀態照送、站台的訊息照接`, async (t) => {
    const h = await setupUnreadable(t, c, { site: { gate: MAINTENANCE_GATE } });

    const s = await h.sync.getInstanceStatus();
    assertKind(s, "local-unreadable");
    assert.deepEqual(h.last(), s);
    assert.ok(
      s.errorTexts[0].startsWith("讀不到本機的同步記錄："),
      s.errorTexts[0],
    );
    assert.ok(s.errorTexts[0].includes(c.file(h.paths)), s.errorTexts[0]);
    assert.equal(s.localReady, false);
    assert.deepEqual(s.syncReasons, []);
    assert.deepEqual(s.allowed, { update: false, repair: false });
    assert.deepEqual(s.gateMessages, ["維修中測試"]);

    h.site.respond = respond503("/release.json");
    const offline = await h.sync.getInstanceStatus();
    assertKind(offline, "local-unreadable");
    assert.deepEqual(offline.errorTexts.slice(1), ["release.json：HTTP 503"]);
  });
}

test("N13 丙 讀記錄丟沒有 syscall 的錯（bug）⇒ internal-error，不是 local-unreadable", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  const realReadFile = fsp.readFile;
  t.mock.method(fsp, "readFile", async function (p, ...rest) {
    if (p === h.paths.syncRecordPath) throw new TypeError("讀檔的參數壞了");
    return realReadFile.call(this, p, ...rest);
  });
  const s = await h.sync.getInstanceStatus();
  assertKind(s, "internal-error");
  assert.ok(s.errorTexts[0].includes("讀檔的參數壞了"), s.errorTexts[0]);
});

const INTERNAL_ERROR_UI = {
  button: { action: "retry", label: "重新檢查", note: null },
  canLaunch: false,
};

/** 就緒 probe 從 javaProbe.throws 為真起丟 TypeError：狀態計算途中的 bug；之前照真的檔案系統 */
function throwingJavaProbe() {
  const javaProbe = { throws: false };
  javaProbe.make = (paths) => {
    const real = makeRuntimeProbe(paths);
    const guard = (fn) => async (...a) => {
      if (javaProbe.throws) throw new TypeError("探針壞了");
      return fn(...a);
    };
    return { readJson: guard(real.readJson), isFile: guard(real.isFile) };
  };
  return javaProbe;
}

function assertInternalError(s) {
  assertKind(s, "internal-error");
  assert.equal(s.errorTexts.length, 1);
  assert.ok(s.errorTexts[0].startsWith("啟動器內部錯誤"), s.errorTexts[0]);
  assert.ok(s.errorTexts[0].includes("探針壞了"), s.errorTexts[0]);
  assert.ok(s.errorDetail.includes("TypeError: 探針壞了"), s.errorDetail);
  assert.ok(/\n\s+at /.test(s.errorDetail), "errorDetail 帶 stack");
  assert.deepEqual(
    { ...s, errorTexts: null, errorDetail: null },
    {
      kind: "internal-error",
      localReady: false,
      ui: INTERNAL_ERROR_UI,
      allowed: { update: false, repair: false },
      syncReasons: [],
      errorTexts: null,
      errorDetail: null,
      gateMessages: [],
      localVersion: "",
      remoteVersion: "",
    },
  );
}

test("N14 internal-error：getInstanceStatus 不 reject、送出的整個物件是規定的形狀、不沿用上一次", async (t) => {
  const javaProbe = throwingJavaProbe();
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { gate: MAINTENANCE_GATE },
    deps: { makeRuntimeProbe: javaProbe.make },
  });
  const before = await h.sync.getInstanceStatus();
  assertKind(before, "maintenance");
  assert.equal(before.localVersion, "1.0");
  assert.equal(before.remoteVersion, "1.0");
  assert.deepEqual(before.gateMessages, ["維修中測試"]);

  javaProbe.throws = true;
  const s = await h.sync.getInstanceStatus();
  assertInternalError(s);
  assert.deepEqual(h.last(), s);
});

test("N17 runtime 接線：沒有 java.exe ⇒ update-available、只報 runtime-missing；更新後齊了", async (t) => {
  const h = await setup(t, { installed: { release: REL_1, java: false } });
  const s = await h.sync.getInstanceStatus();
  assertKind(s, "update-available");
  assert.equal(s.localReady, false);
  assert.deepEqual(s.syncReasons, ["runtime-missing"]);

  await h.sync.updateInstance();
  assertKind(h.last(), "up-to-date");
  assert.equal(h.last().localReady, true);
  assert.deepEqual(h.last().syncReasons, []);
});

test("N18 Status 恰好是規定的那些鍵（沒有 notice）、版本與 gate 訊息", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2, gate: MAINTENANCE_GATE },
  });
  const s = await h.sync.getInstanceStatus();
  assert.deepEqual(Object.keys(s).sort(), [...STATUS_KEYS].sort());
  assertKind(s, "maintenance");
  assert.equal(s.localVersion, "1.0");
  assert.equal(s.remoteVersion, "2.0");
  assert.deepEqual(s.gateMessages, ["維修中測試"]);
  assert.equal(s.errorDetail, null);

  const fresh = await setup(t, { site: { release: REL_2 } });
  const none = await fresh.sync.getInstanceStatus();
  assertKind(none, "not-installed");
  assert.equal(none.localVersion, "");
  assert.equal(none.remoteVersion, "2.0");
});

// ── 建立 ──

// onProgress、siteClient、serverConfig：6b-3b 起必填（M-DI #8）；兩個物件只驗有給（不驗形狀）
const REQUIRED_FUNCTIONS = [
  "readSettings",
  "isMinecraftRunning",
  "log",
  "sendInstanceStatus",
  "confirmGameClosed",
  "onProgress",
];
const REQUIRED_KEYS = [
  ...REQUIRED_FUNCTIONS,
  "launcherVersion",
  "siteClient",
  "serverConfig",
];
const minimalDeps = () => ({
  readSettings: async () => ({}),
  isMinecraftRunning: () => false,
  log: () => {},
  sendInstanceStatus: () => {},
  confirmGameClosed: async () => false,
  onProgress: () => {},
  launcherVersion: "1.0.0",
  siteClient: {},
  serverConfig: {},
});

test("N21 必填都給 ⇒ 不丟（對照列）", () => {
  assert.doesNotThrow(() => createInstanceSync(minimalDeps()));
});

for (const key of REQUIRED_KEYS) {
  const shapes = ["鍵不存在", "值為 undefined"];
  if (REQUIRED_FUNCTIONS.includes(key)) shapes.push("不是函式");
  for (const shape of shapes) {
    test(`N21 缺必填注入 ${key}（${shape}）⇒ TypeError、訊息含鍵名`, () => {
      const deps = minimalDeps();
      if (shape === "鍵不存在") delete deps[key];
      else if (shape === "值為 undefined") deps[key] = undefined;
      else deps[key] = "not a function";
      assert.throws(
        () => createInstanceSync(deps),
        (e) => e instanceof TypeError && e.message.includes(key),
      );
    });
  }
}

test("N21 launcherVersion 不是 x.y.z ⇒ TypeError", () => {
  assert.throws(
    () => createInstanceSync({ ...minimalDeps(), launcherVersion: "abc" }),
    (e) => e instanceof TypeError && e.message.includes("launcherVersion"),
  );
});

// B5（原 N24）：送畫面失敗由 bridge 接住並記常駐日誌，中樞不自己接；接真的 bridge、send 丟錯
// → _notes/plans/cross-review-2026-10-phase6b.md §6b-1 施工方案 D2、D3
const failedChannels = (errors) => errors.map((e) => e[3].channel);

test("B5a 送畫面丟錯（真 bridge）⇒ getInstanceStatus 照樣回傳狀態、記一筆常駐日誌", async (t) => {
  const { bridge, errors } = bridgeWithLiveWindow(throwOnSend);
  const h = await setup(t, {
    installed: { release: REL_1 },
    deps: { sendInstanceStatus: bridge.sendInstanceStatus },
  });
  assertKind(await h.sync.getInstanceStatus(), "up-to-date");
  assert.deepEqual(failedChannels(errors), ["instance:status"]);
});

// ── 更新／修復 ──

const read = (paths, rel) => fsp.readFile(abs(paths, rel));
const exists = (p) =>
  fsp.lstat(p).then(
    () => true,
    () => false,
  );
const kindsSent = (h) => h.sent.map((s) => s.kind);

/**
 * 被擋的出口也放鎖、重算並送出：最後一筆是收尾重算的結果。
 * exactlyOne：還沒進入套用就被擋 ⇒ 只多送收尾那一筆（進入套用的會多一筆 syncing）
 */
function assertRecomputed(h, sentBefore, kind, { exactlyOne = false } = {}) {
  if (exactlyOne) assert.equal(h.sent.length, sentBefore + 1);
  else assert.ok(h.sent.length > sentBefore, "結束後有再送一次狀態");
  assertKind(h.last(), kind);
  assert.equal(h.sync.getLockHolder(), null);
}

test("U3 repairInstance 帶 strayJarsToRemove ⇒ 那些檔進入刪除清單、被刪掉", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  await put(h.paths, "mods/stray.jar", "player mod");
  await h.sync.repairInstance({ strayJarsToRemove: ["mods/stray.jar"] });
  assert.ok(h.calls.applyPlan[0].plan.remove.includes("mods/stray.jar"));
  assert.equal(await exists(abs(h.paths, "mods/stray.jar")), false);
});

test("U4 applyPlan 收到的 prepareRuntime()（無參數）⇒ 新管線被以 paths、release 的 minecraft／loader 呼叫一次", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  await h.sync.updateInstance();
  assert.equal(h.calls.prepareRuntime.length, 1);
  const { onProgress, deps, ...rest } = h.calls.prepareRuntime[0];
  assert.equal(typeof onProgress, "function");
  assert.equal(deps.log, h.deps.log);
  assert.deepEqual(rest, {
    paths: h.paths,
    minecraft: REL_2.minecraft,
    loader: REL_2.loader,
    verifyAll: false,
    reinstallJava: false,
    env: windowsEnv(os.release()), // ⑤b：就緒與安裝用同一份（→ instance-sync-v3-commit5b.md Q2）
  });
});

test("U5／C5 備妥 runtime 停住（替身以 GGL_DOWNLOAD_STALLED reject）⇒ 錯誤往外丟、鎖已放、標記留著、狀態重算為 update-available（interrupted）", async (t) => {
  // 停滯的期限本身在 ④b T16、T22 測；這裡只驗整合（→ instance-sync-v3-commit4c.md C5）
  const boom = Object.assign(new Error("下載停住了"), { code: "GGL_DOWNLOAD_STALLED" });
  const h = await setup(t, {
    installed: { release: REL_1 },
    deps: {
      prepareRuntime: async () => {
        throw boom;
      },
    },
  });
  await assert.rejects(h.sync.repairInstance(), (e) => e === boom);
  assert.equal(h.sync.getLockHolder(), null);
  assert.equal(await isInProgress(h.paths), true);
  assertKind(h.last(), "update-available");
  assert.ok(h.last().syncReasons.includes("interrupted"));
  assert.equal(h.last().localReady, false);
});

test("U12 update 成功與失敗後都送出狀態：成功 up-to-date、失敗 update-available", async (t) => {
  const ok = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  await ok.sync.updateInstance();
  assertKind(ok.last(), "up-to-date");

  const bad = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  bad.hooks.beforeApply = async () => {
    throw new Error("套用失敗");
  };
  await assert.rejects(bad.sync.updateInstance(), /套用失敗/);
  assertKind(bad.last(), "update-available");
});

// U13／U14：前置檢查會遇到的每一個 kind × update／repair。期望寫死，不取自 SYNC_ALLOWED_KINDS
const EXPECT_ALLOWED = {
  update: ["update-available"],
  repair: ["not-installed", "update-available", "up-to-date"],
};
const KIND_CASES = [
  {
    kind: "unconfigured",
    opts: { installed: { release: REL_1 }, config: { manifestUrl: "" } },
  },
  {
    kind: "local-unreadable",
    opts: {},
    arrange: (h) => fsp.mkdir(h.paths.syncRecordPath, { recursive: true }),
  },
  {
    kind: "offline",
    opts: {
      installed: { release: REL_1 },
      site: { respond: respond503("/manifest.json") },
    },
  },
  {
    kind: "maintenance",
    opts: { installed: { release: REL_1 }, site: { gate: MAINTENANCE_GATE } },
  },
  {
    kind: "launcher-too-old",
    name: "gate 最低版本",
    opts: {
      installed: { release: REL_1 },
      site: { gate: { minLauncherVersion: "9.0.0" } },
    },
  },
  {
    kind: "launcher-too-old",
    name: "索引 format 較新",
    opts: {
      installed: { release: REL_1 },
      site: { index: { ...INDEX, format: 4 } },
    },
  },
  {
    kind: "invalid",
    opts: {
      installed: { release: REL_1 },
      site: { release: { version: "x" } },
    },
  },
  {
    kind: "invalid",
    name: "gate 型別錯",
    opts: { installed: { release: REL_1 }, site: { gate: BAD_GATE } },
  },
  {
    kind: "invalid",
    name: "gate 404",
    opts: {
      installed: { release: REL_1 },
      site: { respond: respondBody("/gate.json", 404, "") },
    },
  },
  {
    kind: "invalid",
    name: "gate 型別錯＋沒有記錄（不能安裝）",
    opts: { site: { gate: BAD_GATE } },
  },
  { kind: "not-installed", opts: { site: { release: REL_1 } } },
  {
    kind: "update-available",
    opts: { installed: { release: REL_1 }, site: { release: REL_2 } },
  },
  { kind: "up-to-date", opts: { installed: { release: REL_1 } } },
];

for (const c of KIND_CASES) {
  for (const who of ["update", "repair"]) {
    const allowed = EXPECT_ALLOWED[who].includes(c.kind);
    const label = c.name ? `${c.kind}（${c.name}）` : c.kind;
    test(`U13/U14 kind ${label} × ${who} ⇒ ${allowed ? "執行" : "GGL_SYNC_NOT_ALLOWED"}`, async (t) => {
      const h = await setup(t, c.opts);
      await c.arrange?.(h);
      const s = await h.sync.getInstanceStatus();
      assertKind(s, c.kind);
      assert.deepEqual(s.allowed, {
        update: EXPECT_ALLOWED.update.includes(c.kind),
        repair: EXPECT_ALLOWED.repair.includes(c.kind),
      });
      const run = () =>
        who === "update" ? h.sync.updateInstance() : h.sync.repairInstance();
      if (allowed) {
        await run();
        assert.equal(h.calls.applyPlan.length, 1);
      } else {
        const sentBefore = h.sent.length;
        await assert.rejects(run(), (e) => {
          isCode("GGL_SYNC_NOT_ALLOWED")(e);
          assert.equal(e.kind, c.kind);
          return true;
        });
        assert.equal(h.calls.applyPlan.length, 0);
        assertRecomputed(h, sentBefore, c.kind, { exactlyOne: true });
      }
    });
  }
}

test("U16 update 失敗之後再呼叫一次 ⇒ 不是 BUSY（失敗有放鎖）", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  let fail = true;
  h.hooks.beforeApply = async () => {
    if (fail) throw new Error("套用失敗");
  };
  await assert.rejects(h.sync.updateInstance(), /套用失敗/);
  fail = false;
  await h.sync.updateInstance();
  assertKind(h.last(), "up-to-date");
});

test("U17 isMinecraftRunning 為真 ⇒ update／repair 都是 GGL_SYNC_GAME_RUNNING、不問確認", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: { isMinecraftRunning: () => true },
  });
  await assert.rejects(
    h.sync.updateInstance(),
    isCode("GGL_SYNC_GAME_RUNNING"),
  );
  await assert.rejects(
    h.sync.repairInstance(),
    isCode("GGL_SYNC_GAME_RUNNING"),
  );
  assert.equal(h.calls.confirmGameClosed, 0);
  assert.equal(h.calls.applyPlan.length, 0);
  assert.equal(h.sync.getLockHolder(), null);
});

test(
  "N1 進入套用才送 syncing：第一筆 check 進度與 applyPlan 被呼叫時，最後送出的與另起的計算都是 syncing",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    let h;
    let duringCheck;
    const progress = [];
    h = await setup(t, {
      installed: { release: REL_1 },
      site: { release: REL_2 },
      deps: {
        onProgress: (p) => {
          progress.push(p);
          if (p.phase === "check" && !duringCheck) {
            duringCheck = {
              lastKind: h.last()?.kind,
              fresh: h.sync.getInstanceStatus(),
            };
          }
        },
      },
    });
    let atApply;
    h.hooks.beforeApply = async () => {
      atApply = {
        lastKind: h.last()?.kind,
        fresh: await h.sync.getInstanceStatus(),
      };
    };
    await h.sync.updateInstance();

    assert.ok(duringCheck, "有收到 check 進度");
    assert.equal(duringCheck.lastKind, "syncing");
    assertKind(await duringCheck.fresh, "syncing");
    assert.equal(atApply.lastKind, "syncing");
    assertKind(atApply.fresh, "syncing");
    assertKind(h.last(), "up-to-date");
  },
);

test("N1 進入套用到 applyPlan 被呼叫之間，站台沒有多收到請求", async (t) => {
  let h;
  let requestsAtSyncing;
  h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: {
      sendInstanceStatus: (s) => {
        h.sent.push(s);
        if (s.kind === "syncing") requestsAtSyncing = h.srv.requests.length;
      },
    },
  });
  let requestsAtApply;
  h.hooks.beforeApply = async () => {
    requestsAtApply = h.srv.requests.length;
  };
  await h.sync.updateInstance();
  assert.equal(typeof requestsAtSyncing, "number");
  assert.equal(requestsAtApply, requestsAtSyncing);
});

test(
  "N2 準備中不是 syncing：前置檢查卡住時算出原本的 kind；被 GAME_RUNNING 擋 ⇒ 從沒送過 syncing、鎖已放、結束後再送一次",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    let running = false;
    const h = await setup(t, {
      installed: { release: REL_1 },
      site: { release: REL_2 },
      deps: { isMinecraftRunning: () => running },
    });
    const hold = h.holdFetch("/release.json", 1);
    const update = h.sync.updateInstance();
    await hold.reached.promise;

    assertKind(await h.sync.getInstanceStatus(), "update-available");
    assert.equal(h.sync.getLockHolder(), "update");
    const sentBefore = h.sent.length;
    running = true;
    hold.go.resolve();
    await assert.rejects(update, isCode("GGL_SYNC_GAME_RUNNING"));

    assert.equal(h.sync.getLockHolder(), null);
    assert.ok(!kindsSent(h).includes("syncing"), kindsSent(h).join(","));
    assert.equal(h.sent.length, sentBefore + 1);
  },
);

test(
  "N3 更新開始前起的重新檢查，拖到套用途中才回 ⇒ 最後送出的仍是 syncing",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const h = await setup(t, {
      installed: { release: REL_1 },
      site: { release: REL_2 },
    });
    const hold = h.holdFetch("/release.json", 1);
    const early = h.sync.getInstanceStatus();
    await hold.reached.promise;

    const inApply = deferred();
    const go = deferred();
    t.after(() => go.resolve());
    h.hooks.beforeApply = async () => {
      inApply.resolve();
      await go.promise;
    };
    const update = h.sync.updateInstance();
    await inApply.promise;
    hold.go.resolve();
    assertKind(await early, "update-available");
    assertKind(h.last(), "syncing");

    go.resolve();
    await update;
  },
);

test(
  "N4 套用途中起的重新檢查，拖到收尾重算送出之後才回 ⇒ 它算出 syncing、最後送出的仍是 up-to-date",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const h = await setup(t, {
      installed: { release: REL_1 },
      site: { release: REL_2 },
    });
    // release.json：#1 更新的前置檢查、#2 套用途中起的那次、#3 收尾重算
    const hold = h.holdFetch("/release.json", 2);
    let late;
    h.hooks.beforeApply = async () => {
      late = h.sync.getInstanceStatus();
      await hold.reached.promise;
    };
    await h.sync.updateInstance();
    assertKind(h.last(), "up-to-date");

    hold.go.resolve();
    assertKind(await late, "syncing");
    assertKind(h.last(), "up-to-date");
  },
);

const rejectingPowerShell = async () => {
  throw new Error("powershell 不見了");
};

async function setupUnknownGame(t, confirm) {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: { runPowerShell: rejectingPowerShell },
  });
  h.deps.confirmGameClosed = async () => {
    h.calls.confirmGameClosed++;
    h.holderAtConfirm = h.sync.getLockHolder();
    return confirm(h);
  };
  h.sync = createInstanceSync(h.deps);
  return h;
}

for (const [label, answer] of [
  ["false", false],
  ["1（真值但不是 true）", 1],
]) {
  test(`N5 遊戲偵測判不出來、確認回呼回 ${label} ⇒ GGL_SYNC_GAME_UNKNOWN`, async (t) => {
    const h = await setupUnknownGame(t, () => answer);
    const sentBefore = h.sent.length;
    await assert.rejects(
      h.sync.updateInstance(),
      isCode("GGL_SYNC_GAME_UNKNOWN"),
    );
    assert.equal(h.calls.confirmGameClosed, 1);
    assert.equal(h.holderAtConfirm, "update");
    assert.equal(h.calls.applyPlan.length, 0);
    assert.equal(h.sync.getLockHolder(), null);
    assert.equal(h.sent.length, sentBefore + 1);
  });
}

test("N5 確認回呼回 true ⇒ 重跑前置檢查（等待中換版 ⇒ 裝新的那版）、只問一次", async (t) => {
  const h = await setupUnknownGame(t, (h) => {
    h.site.release = REL_3;
    return true;
  });
  await h.sync.updateInstance();
  assert.equal(h.calls.confirmGameClosed, 1);
  assert.equal((await readRecord(h.paths)).version, "3.0");
  assert.deepEqual(await read(h.paths, "mods/a.jar"), MOD_A2);
});

test("N5 確認回呼回 true、等待中站台改成維護 ⇒ GGL_SYNC_NOT_ALLOWED、applyPlan 未被呼叫", async (t) => {
  const h = await setupUnknownGame(t, (h) => {
    h.site.gate = MAINTENANCE_GATE;
    return true;
  });
  await assert.rejects(h.sync.updateInstance(), (e) => {
    isCode("GGL_SYNC_NOT_ALLOWED")(e);
    assert.equal(e.kind, "maintenance");
    return true;
  });
  assert.equal(h.calls.applyPlan.length, 0);
});

test("N5 確認回呼自己丟錯 ⇒ 那個錯往外丟、鎖已放、收尾送出狀態", async (t) => {
  const boom = new Error("對話框壞了");
  const h = await setupUnknownGame(t, () => {
    throw boom;
  });
  const sentBefore = h.sent.length;
  await assert.rejects(h.sync.updateInstance(), (e) => e === boom);
  assertRecomputed(h, sentBefore, "update-available", { exactlyOne: true });
});

test("N6 遊戲偵測的 gameDir 接線：命令列含 gameDir ⇒ 擋；鄰居路徑與 instanceDir 本身 ⇒ 照常更新", async (t) => {
  for (const [label, dirOf, blocked] of [
    ["gameDir", (p) => p.gameDir, true],
    [
      "鄰居 .minecraft-old",
      (p) => path.join(p.instanceDir, ".minecraft-old"),
      false,
    ],
    ["instanceDir", (p) => p.instanceDir, false],
  ]) {
    let stdout = "";
    const h = await setup(t, {
      installed: { release: REL_1 },
      site: { release: REL_2 },
      deps: { runPowerShell: async () => ({ code: 0, stdout }) },
    });
    stdout = JSON.stringify([
      {
        ProcessId: 4242,
        CommandLine: `"C:\\Java\\bin\\javaw.exe" -Xmx4G --gameDir ${dirOf(h.paths)}`,
      },
    ]);
    if (blocked) {
      await assert.rejects(
        h.sync.updateInstance(),
        isCode("GGL_SYNC_GAME_RUNNING"),
        label,
      );
    } else {
      await h.sync.updateInstance();
      assert.equal(h.calls.applyPlan.length, 1, label);
    }
    assert.equal(h.calls.confirmGameClosed, 0, label);
  }
});

test("N7 有同步中標記、記錄與 release 相同 ⇒ 被改掉的非玩家可改檔換回來", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  await put(h.paths, "mods/a.jar", "tampered");
  await markInProgress(h.paths, NO_LOG);
  await h.sync.updateInstance();
  assert.deepEqual(await read(h.paths, "mods/a.jar"), MOD_A);
});

test("N7 對照：沒有標記、release 另有一個檔不同 ⇒ 被改掉的那個檔不動", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  await put(h.paths, "mods/a.jar", "tampered");
  await h.sync.updateInstance();
  assert.equal(String(await read(h.paths, "mods/a.jar")), "tampered");
  assert.deepEqual(await read(h.paths, "mods/b.jar"), MOD_B2);
});

test("N8 修復 ⇒ 非玩家可改檔換回來、玩家可改檔維持被改的內容", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  await put(h.paths, "mods/a.jar", "tampered");
  await put(h.paths, "config/c.json", "player tweak");
  await h.sync.repairInstance();
  assert.deepEqual(await read(h.paths, "mods/a.jar"), MOD_A);
  assert.equal(String(await read(h.paths, "config/c.json")), "player tweak");
});

test("N9 strayJarsToRemove 帶清單裡的 mod ⇒ GGL_SYNC_IN_MANIFEST、整次拒絕、沒送過 syncing", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  const sentBefore = h.sent.length;
  await assert.rejects(
    h.sync.repairInstance({ strayJarsToRemove: ["mods/a.jar"] }),
    isCode("GGL_SYNC_IN_MANIFEST"),
  );
  assert.equal(h.calls.applyPlan.length, 0);
  assert.equal(await exists(abs(h.paths, "mods/a.jar")), true);
  assert.equal(h.sync.getLockHolder(), null);
  assert.ok(!kindsSent(h).includes("syncing"));
  assert.equal(h.sent.length, sentBefore + 1);
});

test("N9 updateInstance 不收 strayJarsToRemove ⇒ 那個 jar 還在", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  await put(h.paths, "mods/stray.jar", "player mod");
  await h.sync.updateInstance({ strayJarsToRemove: ["mods/stray.jar"] });
  assert.equal(await exists(abs(h.paths, "mods/stray.jar")), true);
});

test("N9 勾選一個計畫本來就會刪的檔（大小寫不同）⇒ remove 裡只有一筆", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_OLD },
    site: { release: REL_1 },
  });
  await h.sync.repairInstance({ strayJarsToRemove: ["mods/OLD.jar"] });
  assert.deepEqual(h.calls.applyPlan[0].plan.remove, ["mods/old.jar"]);
  assert.equal(await exists(abs(h.paths, "mods/old.jar")), false);
});

test("N10 protectedPaths 接線：release 含 saves/world/level.dat ⇒ GGL_SYNC_PROTECTED_PATH", async (t) => {
  const withSave = makeRelease("1.1", [
    ...REL_1.files,
    entry("saves/world/level.dat", CONF),
  ]);
  const h = await setup(t, { site: { release: withSave } });
  const sentBefore = h.sent.length;
  await assert.rejects(
    h.sync.repairInstance(),
    isCode("GGL_SYNC_PROTECTED_PATH"),
  );
  assert.equal(h.calls.applyPlan.length, 0);
  assertRecomputed(h, sentBefore, "not-installed");
});

for (const c of UNREADABLE_CASES) {
  test(`N13 local-unreadable（${c.name}）⇒ updateInstance 是 GGL_SYNC_NOT_ALLOWED、再呼叫也不是 BUSY、每次收尾都送出`, async (t) => {
    const h = await setupUnreadable(t, c);
    for (let i = 0; i < 2; i++) {
      const sentBefore = h.sent.length;
      await assert.rejects(h.sync.updateInstance(), (e) => {
        isCode("GGL_SYNC_NOT_ALLOWED")(e);
        assert.equal(e.kind, "local-unreadable");
        return true;
      });
      assertRecomputed(h, sentBefore, "local-unreadable", { exactlyOne: true });
    }
  });
}

test("N14 internal-error：updateInstance 丟那個 TypeError、鎖已放", async (t) => {
  const javaProbe = throwingJavaProbe();
  javaProbe.throws = true;
  const h = await setup(t, {
    installed: { release: REL_1 },
    deps: { makeRuntimeProbe: javaProbe.make },
  });
  await assert.rejects(
    h.sync.updateInstance(),
    (e) => e instanceof TypeError && e.message === "探針壞了",
  );
  assert.equal(h.sync.getLockHolder(), null);
  assertInternalError(h.last());
});

test("N15 套用成功之後的重算出錯 ⇒ 更新照樣成功回傳，最後送出 internal-error", async (t) => {
  const javaProbe = throwingJavaProbe();
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: {
      makeRuntimeProbe: javaProbe.make,
      applyPlan: async (input) => {
        const r = await realApplyPlan(input);
        javaProbe.throws = true;
        return r;
      },
    },
  });
  assert.deepEqual(await h.sync.updateInstance(), { movedAside: [] });
  assertInternalError(h.last());
});

test("N15 更新本身失敗＋重算也出錯 ⇒ 丟的是更新的原錯誤，最後送出 internal-error", async (t) => {
  const javaProbe = throwingJavaProbe();
  const boom = new Error("套用失敗");
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: { makeRuntimeProbe: javaProbe.make },
  });
  h.hooks.beforeApply = async () => {
    javaProbe.throws = true;
    throw boom;
  };
  await assert.rejects(h.sync.updateInstance(), (e) => e === boom);
  assertInternalError(h.last());
});

test("N19 probe：next 的路徑在本機是資料夾（裡面有玩家的檔）⇒ GGL_SYNC_BLOCKED_BY_DIR，不是 EISDIR", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  await fsp.rm(abs(h.paths, "mods/b.jar"));
  await put(h.paths, "mods/b.jar/mine.txt", "player file");
  const sentBefore = h.sent.length;
  await assert.rejects(
    h.sync.updateInstance(),
    isCode("GGL_SYNC_BLOCKED_BY_DIR"),
  );
  assertRecomputed(h, sentBefore, "update-available");
});

test("N19 probe：記錄有、release 沒有的路徑在本機是資料夾 ⇒ GGL_SYNC_DELETE_IS_DIR", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_OLD },
    site: { release: REL_1 },
  });
  await fsp.rm(abs(h.paths, "mods/old.jar"));
  await put(h.paths, "mods/old.jar/mine.txt", "player file");
  const sentBefore = h.sent.length;
  await assert.rejects(
    h.sync.updateInstance(),
    isCode("GGL_SYNC_DELETE_IS_DIR"),
  );
  assertRecomputed(h, sentBefore, "update-available");
});

test("N20 套用途中站台換版、舊 blob 回 404 ⇒ GGL_SYNC_SITE_CHANGED；進度收得到 check 與套用的", async (t) => {
  const progress = [];
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_3 },
    deps: { onProgress: (p) => progress.push(p) },
  });
  h.hooks.beforeApply = async () => {
    h.site.release = REL_2;
    h.site.blobs.delete(sha(MOD_B2));
  };
  await assert.rejects(
    h.sync.updateInstance(),
    isCode("GGL_SYNC_SITE_CHANGED"),
  );
  const phases = new Set(progress.map((p) => p.phase));
  assert.ok(phases.has("check"), [...phases].join(","));
  assert.ok(
    phases.has("download") || phases.has("verify"),
    [...phases].join(","),
  );
  assert.deepEqual(
    Object.keys(progress.find((p) => p.phase === "check")).sort(),
    ["done", "phase", "total"],
  );
});

test("N23 被擋的出口也重算：站台換成維護 ⇒ NOT_ALLOWED（kind 當場算）、最後送出 maintenance", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  assertKind(await h.sync.getInstanceStatus(), "update-available");
  h.site.gate = MAINTENANCE_GATE;
  await assert.rejects(h.sync.updateInstance(), (e) => {
    isCode("GGL_SYNC_NOT_ALLOWED")(e);
    assert.equal(e.kind, "maintenance");
    return true;
  });
  assertKind(h.last(), "maintenance");
});

test("B5b 送畫面丟錯（真 bridge）⇒ updateInstance 照樣回 { movedAside }、記錄已寫、鎖已放；有常駐日誌", async (t) => {
  const { bridge, errors } = bridgeWithLiveWindow(throwOnSend);
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: { sendInstanceStatus: bridge.sendInstanceStatus },
  });
  assert.deepEqual(await h.sync.updateInstance(), { movedAside: [] });
  assert.equal((await readRecord(h.paths)).version, "2.0");
  assert.equal(h.sync.getLockHolder(), null);
  assert.ok(errors.length >= 1, `常駐日誌 ${errors.length} 筆`);
  assert.ok(failedChannels(errors).every((c) => c === "instance:status"));
});

test("B5d 套用的進度也走真 bridge（onProgress 與 start-main 同形狀）、send 丟錯 ⇒ 更新照樣成功、記錄已寫；每次進度一筆常駐日誌", async (t) => {
  const { bridge, errors } = bridgeWithLiveWindow(throwOnSend);
  let progressCalls = 0;
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: {
      sendInstanceStatus: bridge.sendInstanceStatus,
      onProgress: (p) => {
        progressCalls++;
        const { text, progress01 } = describeProgress(p);
        bridge.sendSyncProgress(text, progress01);
      },
    },
  });
  const r = await h.sync.updateInstance().then(
    (value) => ({ ok: true, value }),
    (error) => ({ ok: false, error }),
  );
  assert.equal(
    (await readRecord(h.paths)).version,
    "2.0",
    `記錄版本；updateInstance ${r.ok ? "成功" : `reject：${r.error?.message}`}`,
  );
  assert.ok(r.ok, `updateInstance reject：${r.error?.stack}`);
  assert.deepEqual(r.value, { movedAside: [] });
  assert.equal(h.sync.getLockHolder(), null);
  assert.ok(progressCalls > 0, "套用有送進度");
  assert.equal(
    failedChannels(errors).filter((c) => c === "sync:progress").length,
    progressCalls,
  );
});

test(
  "N25 H14 的訊息：兩種 BUSY 對到持有者；NOT_ALLOWED、GAME_RUNNING 的動詞對到更新／修復",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const h = await setup(t, { installed: { release: REL_1 } });
    await assert.rejects(h.sync.updateInstance(), {
      message: "現在不能更新（目前狀態：up-to-date）。請重新檢查後再試。",
    });
    await h.sync.withLaunchLock(async () => {
      await assert.rejects(h.sync.repairInstance(), {
        message: "遊戲啟動中，請稍候再試。",
      });
    });

    const entered = deferred();
    const go = deferred();
    t.after(() => go.resolve());
    h.hooks.beforeApply = async () => {
      entered.resolve();
      await go.promise;
    };
    const repair = h.sync.repairInstance();
    await entered.promise;
    await assert.rejects(h.sync.updateInstance(), {
      message: "更新或修復進行中，請等它完成。",
    });
    go.resolve();
    await repair;

    const offline = await setup(t, {
      installed: { release: REL_1 },
      site: { respond: respond503("/manifest.json") },
    });
    await assert.rejects(offline.sync.repairInstance(), {
      message: "現在不能修復（目前狀態：offline）。請重新檢查後再試。",
    });

    const running = await setup(t, {
      installed: { release: REL_1 },
      site: { release: REL_2 },
      deps: { isMinecraftRunning: () => true },
    });
    await assert.rejects(running.sync.updateInstance(), {
      message: "遊戲正在執行中，請先關閉遊戲再更新。",
    });
    await assert.rejects(running.sync.repairInstance(), {
      message: "遊戲正在執行中，請先關閉遊戲再修復。",
    });
  },
);

// ── 啟動閘、清單外 jar ──

/** 卡在套用前的更新／修復；回 { done, go }，測試結束前一定放行 */
async function holdInApply(t, h, run) {
  const entered = deferred();
  const go = deferred();
  t.after(() => go.resolve());
  h.hooks.beforeApply = async () => {
    entered.resolve();
    await go.promise;
  };
  const done = run();
  await entered.promise;
  return { done, go };
}

const neverCalled = (calls) => async () => {
  calls.fn++;
};

test(
  "U1 修復套用中 withLaunchLock ⇒ GGL_SYNC_BUSY、fn 未被呼叫；同時狀態是 syncing",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const h = await setup(t, { installed: { release: REL_1 } });
    const repair = await holdInApply(t, h, () => h.sync.repairInstance());
    const calls = { fn: 0 };
    await assert.rejects(
      h.sync.withLaunchLock(neverCalled(calls)),
      isCode("GGL_SYNC_BUSY"),
    );
    assert.equal(calls.fn, 0);
    assertKind(await h.sync.getInstanceStatus(), "syncing");
    repair.go.resolve();
    await repair.done;
  },
);

test("U7 啟動閘鎖內重算：先算出 up-to-date、換掉 release ⇒ GGL_SYNC_LAUNCH_BLOCKED（update-available）", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  assertKind(await h.sync.getInstanceStatus(), "up-to-date");
  h.site.release = REL_2;
  const calls = { fn: 0 };
  await assert.rejects(h.sync.withLaunchLock(neverCalled(calls)), (e) => {
    isCode("GGL_SYNC_LAUNCH_BLOCKED")(e);
    assertKind(e.status, "update-available");
    return true;
  });
  assert.equal(calls.fn, 0);
});

test(
  "U9 啟動閘不加入進行中的計算：更新套用中起的計算卡住，更新失敗（標記留著）後 ⇒ LAUNCH_BLOCKED（update-available）",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    let h;
    let stuck;
    // release.json：#1 更新的前置檢查、#2 套用中起的那次（卡住）、#3 收尾重算、#4 啟動閘
    h = await setup(t, {
      installed: { release: REL_1 },
      deps: {
        prepareRuntime: async () => {
          stuck = h.sync.getInstanceStatus();
          await hold.reached.promise;
          throw new Error("Java 下載失敗");
        },
      },
    });
    const hold = h.holdFetch("/release.json", 2);
    await assert.rejects(h.sync.repairInstance(), /Java 下載失敗/);
    assert.equal(await isInProgress(h.paths), true);

    await assert.rejects(
      h.sync.withLaunchLock(async () => {}),
      (e) => {
        isCode("GGL_SYNC_LAUNCH_BLOCKED")(e);
        assertKind(e.status, "update-available");
        return true;
      },
    );
    hold.go.resolve();
    assertKind(await stuck, "syncing");
  },
);

// 期限交給 mock 時鐘：請求都到了才推進，推進到期限前 1 ms 仍未結束、再 1 ms 才結束（→ _notes/plans/test-real-clock.md）
const TIMEOUT_MS = 1000;
const hangOn = (files) => (req) => files.includes(req.url); // 不回應、不關：只等期限
const requestsTo = (h, file) =>
  h.srv.requests.filter((r) => r.url === file).length;

test(
  "U10 站台不回應（索引還沒抓到過）⇒ withLaunchLock 在一個期限到時返回、kind offline、只多一個索引的請求",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const clock = useMockClock(t);
    const h = await setup(t, {
      installed: { release: REL_1 },
      site: { respond: hangOn(["/manifest.json"]) },
      timeoutMs: TIMEOUT_MS,
    });
    const p = h.sync.withLaunchLock(async (s) => s);
    const w = watch(p);
    await until(() => requestsTo(h, "/manifest.json") === 1, "索引請求送達");
    clock.advance(TIMEOUT_MS - 1);
    assert.ok(await stillPending(w), "期限到之前不該結束");
    clock.advance(1);
    const status = await p;
    assertKind(status, "offline");
    assert.equal(requestsTo(h, "/manifest.json"), 1);
    assert.equal(requestsTo(h, "/gate.json"), 0);
    assert.equal(requestsTo(h, "/release.json"), 0);
  },
);

test(
  "U10 站台不回應（索引已在快取）⇒ gate 與 release 同時等、一個期限到時返回、kind offline、各多一個請求、索引 0 個",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const clock = useMockClock(t);
    const h = await setup(t, {
      installed: { release: REL_1 },
      timeoutMs: TIMEOUT_MS,
    });
    assertKind(await h.sync.getInstanceStatus(), "up-to-date");
    const before = {
      index: requestsTo(h, "/manifest.json"),
      gate: requestsTo(h, "/gate.json"),
      release: requestsTo(h, "/release.json"),
    };
    h.site.respond = hangOn(["/gate.json", "/release.json"]);

    const p = h.sync.withLaunchLock(async (s) => s);
    const w = watch(p);
    // 兩個請求都到了才推進：一個接一個抓的話，第二個在推進前不會出現（取代原本「1.8 個期限內」）
    await until(
      () =>
        requestsTo(h, "/gate.json") === before.gate + 1 &&
        requestsTo(h, "/release.json") === before.release + 1,
      "gate 與 release 的請求都送達",
    );
    clock.advance(TIMEOUT_MS - 1);
    assert.ok(await stillPending(w), "期限到之前不該結束");
    clock.advance(1);
    const status = await p;
    assertKind(status, "offline");
    assert.equal(requestsTo(h, "/manifest.json"), before.index);
    assert.equal(requestsTo(h, "/gate.json"), before.gate + 1);
    assert.equal(requestsTo(h, "/release.json"), before.release + 1);
  },
);

test("U15 啟動持鎖時 update ⇒ GGL_SYNC_BUSY，之後持有者仍是 launch", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
  });
  // update-available 不可啟動：用 offline＋本機齊，閘才會放行到 fn
  h.site.respond = respond503("/release.json");
  await h.sync.withLaunchLock(async () => {
    await assert.rejects(h.sync.updateInstance(), isCode("GGL_SYNC_BUSY"));
    assert.equal(h.sync.getLockHolder(), "launch");
  });
  assert.equal(h.calls.applyPlan.length, 0);
});

test("N11 listStrayJars：列出清單外 jar，記錄有、release 沒有的不列", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_OLD },
    site: { release: REL_1 },
  });
  await put(h.paths, "mods/zeta.jar", "player");
  await put(h.paths, "mods/Alpha.JAR", "player");
  await put(h.paths, "mods/notes.txt", "not a jar");
  assert.deepEqual(await h.sync.listStrayJars(), [
    "mods/Alpha.JAR",
    "mods/zeta.jar",
  ]);
});

test("N11 listStrayJars：mods/ 不存在 ⇒ []", async (t) => {
  const h = await setup(t, { site: { release: REL_1 } });
  assert.deepEqual(await h.sync.listStrayJars(), []);
});

test("N11 listStrayJars：站台抓不到 ⇒ GGL_SYNC_NOT_ALLOWED", async (t) => {
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { respond: respond503("/manifest.json") },
  });
  await assert.rejects(h.sync.listStrayJars(), isCode("GGL_SYNC_NOT_ALLOWED"));
});

test("N11 listStrayJars：gate 壞 ⇒ GGL_SYNC_NOT_ALLOWED（安裝流程的第一步就擋）", async (t) => {
  const h = await setup(t, { site: { gate: BAD_GATE } });
  await assert.rejects(h.sync.listStrayJars(), (e) => {
    isCode("GGL_SYNC_NOT_ALLOWED")(e);
    assert.equal(e.kind, "invalid");
    return true;
  });
});

test("gate 壞經真的 site-client：404、非 JSON 的原因進 errorTexts，gateMessages 不另出", async (t) => {
  for (const [respond, line] of [
    [respondBody("/gate.json", 404, ""), "gate.json：HTTP 404"],
    [respondBody("/gate.json", 200, "{ not json"), "gate.json：內容不是 JSON"],
  ]) {
    const h = await setup(t, { installed: { release: REL_1 }, site: { respond } });
    const s = await h.sync.getInstanceStatus();
    assertKind(s, "invalid");
    assert.deepEqual(s.gateMessages, [], line);
    assert.deepEqual(s.errorTexts, [line]);
    assert.deepEqual(s.allowed, { update: false, repair: false }, line);
    assert.equal(s.ui.canLaunch, true, line);
  }
});

test(
  "N11 listStrayJars：修復套用中 ⇒ GGL_SYNC_NOT_ALLOWED（syncing）；啟動持鎖時照常回",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const h = await setup(t, { installed: { release: REL_1 } });
    await put(h.paths, "mods/stray.jar", "player");
    const repair = await holdInApply(t, h, () => h.sync.repairInstance());
    await assert.rejects(h.sync.listStrayJars(), (e) => {
      isCode("GGL_SYNC_NOT_ALLOWED")(e);
      assert.equal(e.kind, "syncing");
      return true;
    });
    repair.go.resolve();
    await repair.done;

    await h.sync.withLaunchLock(async () => {
      assert.deepEqual(await h.sync.listStrayJars(), ["mods/stray.jar"]);
    });
  },
);

for (const c of UNREADABLE_CASES) {
  test(`N13 local-unreadable（${c.name}）⇒ withLaunchLock 被擋、listStrayJars 是 NOT_ALLOWED`, async (t) => {
    const h = await setupUnreadable(t, c);
    await assert.rejects(
      h.sync.withLaunchLock(async () => {}),
      (e) => {
        isCode("GGL_SYNC_LAUNCH_BLOCKED")(e);
        assertKind(e.status, "local-unreadable");
        return true;
      },
    );
    await assert.rejects(
      h.sync.listStrayJars(),
      isCode("GGL_SYNC_NOT_ALLOWED"),
    );
  });
}

test("N14 internal-error：withLaunchLock ⇒ GGL_SYNC_LAUNCH_BLOCKED", async (t) => {
  const javaProbe = throwingJavaProbe();
  javaProbe.throws = true;
  const h = await setup(t, {
    installed: { release: REL_1 },
    deps: { makeRuntimeProbe: javaProbe.make },
  });
  await assert.rejects(
    h.sync.withLaunchLock(async () => {}),
    (e) => {
      isCode("GGL_SYNC_LAUNCH_BLOCKED")(e);
      assertInternalError(e.status);
      return true;
    },
  );
  assert.equal(h.sync.getLockHolder(), null);
});

test("N16 withLaunchLock 放行：fn 呼叫一次、拿到並送出那筆狀態、回傳 fn 的值；fn 裡鎖是 launch", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  let calls = 0;
  const result = await h.sync.withLaunchLock(async (status) => {
    calls++;
    assertKind(status, "up-to-date");
    assert.equal(h.last(), status);
    await new Promise((r) => setImmediate(r));
    assert.equal(h.sync.getLockHolder(), "launch");
    await assert.rejects(
      h.sync.withLaunchLock(async () => {}),
      isCode("GGL_SYNC_BUSY"),
    );
    return "spawned";
  });
  assert.equal(result, "spawned");
  assert.equal(calls, 1);
  assert.equal(h.sync.getLockHolder(), null);
});

test("N16 fn 丟錯 ⇒ 錯誤原樣丟出、鎖已放；不放行 ⇒ 鎖已放", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  const boom = new Error("spawn 失敗");
  await assert.rejects(
    h.sync.withLaunchLock(async () => {
      throw boom;
    }),
    (e) => e === boom,
  );
  assert.equal(h.sync.getLockHolder(), null);

  h.site.release = REL_2;
  await assert.rejects(
    h.sync.withLaunchLock(async () => {}),
    isCode("GGL_SYNC_LAUNCH_BLOCKED"),
  );
  assert.equal(h.sync.getLockHolder(), null);
});

test(
  "N16 先起一次卡住的 getInstanceStatus、再跑 withLaunchLock、最後放行前者 ⇒ 最後送出的是閘算的那筆",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const h = await setup(t, { installed: { release: REL_1 } });
    const hold = h.holdFetch("/release.json", 1);
    const early = h.sync.getInstanceStatus();
    await hold.reached.promise;

    h.site.release = REL_2;
    await assert.rejects(
      h.sync.withLaunchLock(async () => {}),
      isCode("GGL_SYNC_LAUNCH_BLOCKED"),
    );
    hold.go.resolve();
    assertKind(await early, "up-to-date");
    assertKind(h.last(), "update-available");
  },
);

// N22 啟動閘矩陣（H3）：每格寫死輸入、期望的 kind、localReady、放不放行、被擋時的 syncReasons。
// 排除的格：syncing（經 withLaunchLock 會先撞 GGL_SYNC_BUSY，U1）；up-to-date＋不齊、not-installed＋齊、
// local-unreadable＋齊（定義上不存在）
const noJava = (release) => ({ release, java: false });
const LAUNCH_MATRIX = [
  {
    name: "unconfigured＋齊",
    opts: { installed: { release: REL_1 }, config: { manifestUrl: "" } },
    kind: "unconfigured",
    localReady: true,
    reasons: [],
  },
  {
    name: "unconfigured＋不齊（沒有記錄、沒有 Java）",
    opts: { config: { manifestUrl: "" } },
    kind: "unconfigured",
    localReady: false,
    reasons: ["no-record", "runtime-missing"],
  },
  {
    name: "local-unreadable",
    opts: {},
    arrange: (h) => fsp.mkdir(h.paths.syncRecordPath, { recursive: true }),
    kind: "local-unreadable",
    localReady: false,
    reasons: [],
  },
  {
    name: "offline＋齊",
    opts: {
      installed: { release: REL_1 },
      site: { respond: respond503("/manifest.json") },
    },
    kind: "offline",
    localReady: true,
    launch: true,
  },
  {
    name: "offline＋不齊（有標記）",
    opts: {
      installed: { release: REL_1 },
      site: { respond: respond503("/manifest.json") },
    },
    arrange: (h) => markInProgress(h.paths, NO_LOG),
    kind: "offline",
    localReady: false,
    reasons: ["interrupted"],
  },
  {
    name: "maintenance＋齊",
    opts: { installed: { release: REL_1 }, site: { gate: MAINTENANCE_GATE } },
    kind: "maintenance",
    localReady: true,
    launch: true,
  },
  {
    name: "maintenance＋不齊（沒有記錄、沒有 Java）",
    opts: { site: { gate: MAINTENANCE_GATE } },
    kind: "maintenance",
    localReady: false,
    reasons: ["no-record", "runtime-missing"],
  },
  {
    name: "launcher-too-old＋齊（gate 最低版本）",
    opts: {
      installed: { release: REL_1 },
      site: { gate: { minLauncherVersion: "9.0.0" } },
    },
    kind: "launcher-too-old",
    localReady: true,
    launch: true,
  },
  {
    name: "launcher-too-old＋齊（索引 format 較新）",
    opts: {
      installed: { release: REL_1 },
      site: { index: { ...INDEX, format: 4 } },
    },
    kind: "launcher-too-old",
    localReady: true,
    launch: true,
  },
  {
    name: "launcher-too-old＋不齊（沒有 Java）",
    opts: {
      installed: noJava(REL_1),
      site: { gate: { minLauncherVersion: "9.0.0" } },
    },
    kind: "launcher-too-old",
    localReady: false,
    reasons: ["runtime-missing"],
  },
  {
    name: "invalid＋齊",
    opts: {
      installed: { release: REL_1 },
      site: { release: { version: "x" } },
    },
    kind: "invalid",
    localReady: true,
    launch: true,
  },
  {
    name: "invalid＋不齊（沒有 Java）",
    opts: { installed: noJava(REL_1), site: { release: { version: "x" } } },
    kind: "invalid",
    localReady: false,
    reasons: ["runtime-missing"],
  },
  {
    name: "invalid＋齊（gate 型別錯）",
    opts: { installed: { release: REL_1 }, site: { gate: BAD_GATE } },
    kind: "invalid",
    localReady: true,
    launch: true,
  },
  {
    name: "invalid＋不齊（gate 型別錯、沒有 Java）",
    opts: { installed: noJava(REL_1), site: { gate: BAD_GATE } },
    kind: "invalid",
    localReady: false,
    reasons: ["runtime-missing"],
  },
  {
    name: "invalid＋齊、站台有新版（gate 型別錯）⇒ 啟動本機舊版（D-GATE-STALE）",
    opts: {
      installed: { release: REL_1 },
      site: { gate: BAD_GATE, release: REL_2 },
    },
    kind: "invalid",
    localReady: true,
    launch: true,
  },
  {
    name: "not-installed（沒有記錄、沒有 Java）",
    opts: { site: { release: REL_1 } },
    kind: "not-installed",
    localReady: false,
    reasons: ["no-record", "runtime-missing"],
  },
  {
    name: "update-available＋齊（release 不同）",
    opts: { installed: { release: REL_1 }, site: { release: REL_2 } },
    kind: "update-available",
    localReady: true,
    reasons: ["release-differs"],
  },
  {
    name: "update-available＋不齊（沒有 Java）",
    opts: { installed: noJava(REL_1) },
    kind: "update-available",
    localReady: false,
    reasons: ["runtime-missing"],
  },
  {
    name: "up-to-date＋齊",
    opts: { installed: { release: REL_1 } },
    kind: "up-to-date",
    localReady: true,
    launch: true,
  },
];

for (const c of LAUNCH_MATRIX) {
  test(`N22 啟動閘 ${c.name} ⇒ ${c.launch ? "放行" : "擋"}`, async (t) => {
    const h = await setup(t, c.opts);
    await c.arrange?.(h);
    const calls = { fn: 0 };
    if (c.launch) {
      const status = await h.sync.withLaunchLock(async (s) => {
        calls.fn++;
        return s;
      });
      assertKind(status, c.kind);
      assert.equal(status.localReady, c.localReady);
      assert.equal(calls.fn, 1);
    } else {
      await assert.rejects(h.sync.withLaunchLock(neverCalled(calls)), (e) => {
        isCode("GGL_SYNC_LAUNCH_BLOCKED")(e);
        assertKind(e.status, c.kind);
        assert.equal(e.status.localReady, c.localReady);
        assert.deepEqual(e.status.syncReasons, c.reasons);
        return true;
      });
      assert.equal(calls.fn, 0);
    }
    assert.equal(h.sync.getLockHolder(), null);
  });
}

test("B5c 送畫面丟錯（真 bridge）⇒ withLaunchLock 照樣呼叫 fn、結束後鎖已放；記一筆常駐日誌", async (t) => {
  const { bridge, errors } = bridgeWithLiveWindow(throwOnSend);
  const h = await setup(t, {
    installed: { release: REL_1 },
    deps: { sendInstanceStatus: bridge.sendInstanceStatus },
  });
  let calls = 0;
  await h.sync.withLaunchLock(async () => {
    calls++;
  });
  assert.equal(calls, 1);
  assert.equal(h.sync.getLockHolder(), null);
  assert.deepEqual(failedChannels(errors), ["instance:status"]);
});

// ── 補強（N26–N31，2026-10-06 外部審查的缺口）──

test(
  "N26 收尾重算卡住時 updateInstance 尚未回傳；放行後才回",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const h = await setup(t, {
      installed: { release: REL_1 },
      site: { release: REL_2 },
    });
    // release.json：#1 更新的前置檢查、#2 收尾重算
    const hold = h.holdFetch("/release.json", 2);
    let settled = false;
    const update = h.sync.updateInstance().finally(() => {
      settled = true;
    });
    await hold.reached.promise;
    await new Promise((r) => setImmediate(r));
    assert.equal(settled, false, "收尾重算還沒跑完就回傳了");
    assertKind(h.last(), "syncing");

    hold.go.resolve();
    await update;
    assertKind(h.last(), "up-to-date");
  },
);

test("N27 讀標記丟沒有 syscall 的錯（bug）⇒ internal-error，不是 local-unreadable", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  const realStat = fsp.stat;
  t.mock.method(fsp, "stat", async function (p, ...rest) {
    if (p === h.paths.syncInProgressPath)
      throw new TypeError("stat 的參數壞了");
    return realStat.call(this, p, ...rest);
  });
  const s = await h.sync.getInstanceStatus();
  assertKind(s, "internal-error");
  assert.ok(s.errorTexts[0].includes("stat 的參數壞了"), s.errorTexts[0]);
});

for (const [label, thrown, shown] of [
  ["字串", "壞掉的字串", "壞掉的字串"],
  ["沒有 message 的物件", { code: 7 }, "[object Object]"],
]) {
  test(`N28 H17 狀態計算途中丟${label} ⇒ errorTexts 顯示 ${shown}`, async (t) => {
    const h = await setup(t, {
      installed: { release: REL_1 },
      deps: {
        makeRuntimeProbe: () => ({
          readJson: async () => {
            throw thrown;
          },
          isFile: async () => {
            throw thrown;
          },
        }),
      },
    });
    const s = await h.sync.getInstanceStatus();
    assertKind(s, "internal-error");
    assert.deepEqual(s.errorTexts, [`啟動器內部錯誤，請回報：${shown}`]);
    assert.equal(s.errorDetail, shown);
  });
}

test("N29 mods 是一個檔案 ⇒ listStrayJars 把讀目錄的錯往外丟，不回 []", async (t) => {
  const h = await setup(t, { site: { release: REL_1 } });
  await put(h.paths, "mods", "not a folder");
  await assert.rejects(h.sync.listStrayJars(), isCode("ENOTDIR"));
});

for (const [label, jar, code] of [
  ["不是 jar", "mods/notes.txt", "GGL_SYNC_NOT_STRAY_JAR"],
  ["路徑不合法", "mods/../x.jar", "GGL_SYNC_BAD_PATH"],
  ["受保護路徑", "saves/x.jar", "GGL_SYNC_PROTECTED_PATH"],
]) {
  test(`N30 勾選被拒（${label}）⇒ ${code}、訊息帶檔名、整次拒絕、收尾送出`, async (t) => {
    const h = await setup(t, { installed: { release: REL_1 } });
    const sentBefore = h.sent.length;
    await assert.rejects(
      h.sync.repairInstance({ strayJarsToRemove: [jar] }),
      (e) => {
        isCode(code)(e);
        assert.ok(e.message.includes(jar), e.message);
        return true;
      },
    );
    assert.equal(h.calls.applyPlan.length, 0);
    assert.ok(!kindsSent(h).includes("syncing"));
    assertRecomputed(h, sentBefore, "up-to-date", { exactlyOne: true });
  });
}

test("N31 H6 檔名過不了路徑檢查的 jar 照列；勾了它 ⇒ 整次修復被拒、訊息帶檔名與原因", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  // 8.3 短檔名的形狀：Windows 建得出來，路徑檢查判 short-name
  const jar = "mods/MODA~1.jar";
  await put(h.paths, jar, "player mod");
  assert.deepEqual(await h.sync.listStrayJars(), [jar]);

  await assert.rejects(
    h.sync.repairInstance({ strayJarsToRemove: [jar] }),
    (e) => {
      isCode("GGL_SYNC_BAD_PATH")(e);
      assert.ok(e.message.includes(jar), e.message);
      assert.ok(e.message.includes("short-name"), e.message);
      return true;
    },
  );
  assert.equal(h.calls.applyPlan.length, 0);
  assert.equal(await exists(abs(h.paths, jar)), true);
});

// ── ④c：runtime 接電（→ _notes/plans/instance-sync-v3-commit4c.md §測試 C4、C5、C12、C13、C14） ──

test("C4 verifyAll／reinstallJava 依 who 與同步中標記：四種組合", async (t) => {
  const cases = [
    ["update", false, { verifyAll: false, reinstallJava: false }],
    ["update", true, { verifyAll: true, reinstallJava: false }],
    ["repair", false, { verifyAll: true, reinstallJava: true }],
    ["repair", true, { verifyAll: true, reinstallJava: true }],
  ];
  for (const [who, marked, expected] of cases) {
    const h = await setup(t, { installed: { release: REL_1 }, site: { release: REL_2 } });
    if (marked) await markInProgress(h.paths, NO_LOG);
    await (who === "update" ? h.sync.updateInstance() : h.sync.repairInstance());
    const arg = h.calls.prepareRuntime.at(-1);
    assert.deepEqual(
      { verifyAll: arg.verifyAll, reinstallJava: arg.reinstallJava },
      expected,
      `${who} 標記=${marked}`,
    );
  }
});

test("C4 成功後記錄的三欄＝release 要的；裝出來的不是這次 release 要的 ⇒ 更新失敗、記錄不變", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 }, site: { release: REL_2 } });
  await h.sync.updateInstance();
  const rec = await readRecord(h.paths);
  assert.deepEqual(
    { minecraft: rec.minecraft, loader: rec.loader, javaMajor: rec.javaMajor },
    { minecraft: REL_2.minecraft, loader: REL_2.loader, javaMajor: 21 },
  );

  const bad = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: { prepareRuntime: async () => ({ ...RUNTIME, loader: { type: "fabric", version: "0.19.1" } }) },
  });
  await assert.rejects(bad.sync.updateInstance(), /不是這次要的/);
  assert.equal((await readRecord(bad.paths)).version, REL_1.version);
  assert.equal(await isInProgress(bad.paths), true);
});

test("C5 runtime 備妥後第 N 個同步檔失敗 ⇒ 記錄不變、舊 launchId 仍就緒、D2 沒跑；重跑可完成", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 }, site: { release: REL_2 } });
  const stale = path.join(h.paths.gameDir, "versions", "fabric-loader-0.18.0-1.21.10");
  await fsp.mkdir(stale, { recursive: true });
  const blob = sha(MOD_B2);
  h.site.blobs.delete(blob);
  await assert.rejects(h.sync.updateInstance());
  assert.equal((await readRecord(h.paths)).version, REL_1.version);
  assert.equal(await exists(stale), true, "更新失敗時 D2 一個都不刪");
  const s = await h.sync.getInstanceStatus();
  assertKind(s, "update-available");
  assert.deepEqual(s.syncReasons, ["release-differs", "interrupted"]);

  h.site.blobs.set(blob, MOD_B2);
  await h.sync.updateInstance();
  assertKind(h.last(), "up-to-date");
  assert.equal(h.calls.prepareRuntime.at(-1).verifyAll, true, "上次沒跑完 ⇒ 這次全驗");
});

test("C12 就緒走預設 probe：③ 的記錄（沒三欄）⇒ update-available，不是 internal-error", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  await writeRecord(h.paths, {
    format: 3,
    version: REL_1.version,
    appliedAt: "2026-10-01T00:00:00.000Z",
    files: recordFiles(REL_1),
  }, NO_LOG);
  const s = await h.sync.getInstanceStatus();
  assertKind(s, "update-available");
  assert.deepEqual(s.syncReasons, ["release-differs", "runtime-missing"]);
});

test("C12 刪一支 library ⇒ runtime-missing、不能啟動、fn 沒被呼叫", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  assertKind(await h.sync.getInstanceStatus(), "up-to-date");
  const lib = runtimeFileRels().find((r) => r.startsWith("libraries/"));
  await fsp.rm(abs(h.paths, lib));
  const s = await h.sync.getInstanceStatus();
  assertKind(s, "update-available");
  assert.deepEqual(s.syncReasons, ["runtime-missing"]);
  let called = 0;
  await assert.rejects(
    h.sync.withLaunchLock(async () => {
      called++;
    }),
    isCode("GGL_SYNC_LAUNCH_BLOCKED"),
  );
  assert.equal(called, 0);
});

test("C12 就緒 probe 丟帶 syscall 的讀檔錯 ⇒ local-unreadable，不是 internal-error", async (t) => {
  const eperm = Object.assign(new Error("EPERM: operation not permitted"), { code: "EPERM", syscall: "lstat" });
  const h = await setup(t, {
    installed: { release: REL_1 },
    deps: {
      makeRuntimeProbe: (paths) => ({
        ...makeRuntimeProbe(paths),
        isFile: async () => {
          throw eperm;
        },
      }),
    },
  });
  const s = await h.sync.getInstanceStatus();
  assertKind(s, "local-unreadable");
  assert.ok(s.errorTexts[0].includes("EPERM"), s.errorTexts[0]);
});

/** C13 的混合目錄：gameDir/versions 與 root/runtime 各放一組（installRuntime 已放好目前那套） */
async function arrangeStale(paths) {
  const versions = path.join(paths.gameDir, "versions");
  const runtime = path.join(paths.root, "runtime");
  const json = async (dir, name, value) => {
    await fsp.mkdir(path.join(dir, name), { recursive: true });
    await fsp.writeFile(path.join(dir, name, `${name}.json`), typeof value === "string" ? value : JSON.stringify(value));
  };
  await json(versions, "fabric-loader-0.19.1-1.21.11", { inheritsFrom: "1.21.11" });
  await fsp.mkdir(path.join(versions, "fabric-loader-0.18.0-1.21.10"), { recursive: true });
  await json(versions, "1.21.10", { id: "1.21.10" });
  await json(versions, "broken", "{ not json");
  await json(versions, "my-loader", { inheritsFrom: "1.21.10" });
  await fsp.writeFile(path.join(versions, "1.20"), "a file, not a dir");
  for (const d of ["java-17", "java-21.old", "java-17.old", "foo"]) {
    await fsp.mkdir(path.join(runtime, d), { recursive: true });
  }
  await fsp.writeFile(path.join(runtime, "java-16"), "a file, not a dir");
  return { versions, runtime };
}
const KEPT_VERSIONS = ["1.20", "1.21.11", "broken", "fabric-loader-0.19.3-1.21.11", "my-loader"];
const KEPT_RUNTIME = ["foo", "java-16", "java-21", "java-21.old"];
const ls = async (dir) => (await fsp.readdir(dir)).sort();

test("C13 D2：更新成功 ⇒ 兩個基底剩下的各自等於白名單、垃圾區不在、log 逐筆", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 }, site: { release: REL_2 } });
  const d = await arrangeStale(h.paths);
  await fsp.mkdir(path.join(h.paths.tempDir, "runtime-trash", "leftover"), { recursive: true });
  await h.sync.updateInstance();
  assert.deepEqual(await ls(d.versions), KEPT_VERSIONS);
  assert.deepEqual(await ls(d.runtime), KEPT_RUNTIME);
  assert.equal(await exists(path.join(h.paths.tempDir, "runtime-trash")), false);
  const moved = h.logs.filter((l) => l.startsWith("RUNTIME_CLEANUP moved")).sort();
  assert.deepEqual(moved, [
    "RUNTIME_CLEANUP moved runtime/java-17",
    "RUNTIME_CLEANUP moved runtime/java-17.old",
    "RUNTIME_CLEANUP moved versions/1.21.10",
    "RUNTIME_CLEANUP moved versions/fabric-loader-0.18.0-1.21.10",
    "RUNTIME_CLEANUP moved versions/fabric-loader-0.19.1-1.21.11",
  ]);
  assertKind(h.last(), "up-to-date");
});

test("C13 D2：每個都先整個搬進垃圾區（不在原地 rm）、第一個搬移時記錄已經是新的；同步檔失敗 ⇒ 一個都沒少", async (t) => {
  const order = [];
  const moves = [];
  let h;
  h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: {
      cleanupFs: {
        ...fsp,
        rename: async (from, to) => {
          order.push((await readRecord(h.paths)).version);
          moves.push(to);
          return fsp.rename(from, to);
        },
      },
    },
  });
  await arrangeStale(h.paths);
  await h.sync.updateInstance();
  assert.equal(moves.length, 5, "C13 白名單外的五個都經過搬移");
  const trash = path.join(h.paths.tempDir, "runtime-trash");
  for (const to of moves) assert.equal(path.dirname(to), trash, to);
  assert.deepEqual([...new Set(order)], [REL_2.version]);

  const f = await setup(t, { installed: { release: REL_1 }, site: { release: REL_2 } });
  const d = await arrangeStale(f.paths);
  const before = { versions: await ls(d.versions), runtime: await ls(d.runtime) };
  f.site.blobs.delete(sha(MOD_B2));
  await assert.rejects(f.sync.updateInstance());
  assert.deepEqual({ versions: await ls(d.versions), runtime: await ls(d.runtime) }, before);
});

test("C13 D2：第一個搬移丟錯 ⇒ 更新仍成功、後面的照搬、log 一行失敗", async (t) => {
  let first = true;
  const h = await setup(t, {
    installed: { release: REL_1 },
    site: { release: REL_2 },
    deps: {
      cleanupFs: {
        ...fsp,
        rename: async (...a) => {
          if (first) {
            first = false;
            throw Object.assign(new Error("EBUSY: resource busy"), { code: "EBUSY" });
          }
          return fsp.rename(...a);
        },
      },
    },
  });
  const d = await arrangeStale(h.paths);
  await h.sync.updateInstance();
  assertKind(h.last(), "up-to-date");
  const fails = h.logs.filter((l) => l.startsWith("RUNTIME_CLEANUP_FAIL"));
  assert.equal(fails.length, 1, JSON.stringify(h.logs));
  assert.ok(fails[0].includes("EBUSY"), fails[0]);
  const left = [...(await ls(d.versions)), ...(await ls(d.runtime))].filter(
    (n) => !KEPT_VERSIONS.includes(n) && !KEPT_RUNTIME.includes(n),
  );
  assert.equal(left.length, 1, `只有搬失敗的那個留著：${left}`);
});

test("C14 A1：fn 拿到閘那次的 settings／paths／record；一次啟動只讀一次設定", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  let reads = 0;
  const first = h.settings;
  h.deps.readSettings = async () => {
    reads++;
    return reads === 1 ? first : { launcherRootDir: "Z:/不該被讀到" };
  };
  const sync = createInstanceSync(h.deps);
  let got;
  await sync.withLaunchLock(async (status, inputs) => {
    got = { status, inputs };
  });
  assert.equal(reads, 1);
  assert.equal(got.inputs.settings, first);
  assert.deepEqual(got.inputs.paths, getPaths(first));
  assert.deepEqual(got.inputs.record, await readRecord(h.paths));
  assertKind(got.status, "up-to-date");
});

// → _notes/plans/instance-sync-v3-commit5c.md S5（P2′ 閘交出成品；C8 當場重算；C9 成品不送畫面）
test("S5 fn 拿到就緒的成品；狀態算過之後 json 才改 ⇒ 拿到的是新的；送畫面的 status 不帶成品", async (t) => {
  const h = await setup(t, { installed: { release: REL_1 } });
  await h.sync.getInstanceStatus();
  const edit = async (rel, change) => {
    const p = path.join(h.paths.gameDir, ...rel.split("/"));
    const json = JSON.parse(await fsp.readFile(p, "utf8"));
    change(json);
    await fsp.writeFile(p, JSON.stringify(json));
  };
  // 兩份都要是當場讀的：type 取 Fabric 那層，jvm 參數多的那個在原版
  const mc = RUNTIME.minecraft;
  await edit(`versions/${LAUNCH_ID}/${LAUNCH_ID}.json`, (j) => {
    j.type = "snapshot";
  });
  await edit(`versions/${mc}/${mc}.json`, (j) => {
    j.arguments.jvm.push("-Dggl.check=1");
  });

  let got;
  await h.sync.withLaunchLock(async (_status, inputs) => {
    got = inputs;
  });
  assert.equal(got.launch.merged.id, LAUNCH_ID);
  assert.deepEqual(got.launch.env, windowsEnv(os.release()));
  assert.equal(got.launch.merged.type, "snapshot");
  assert.ok(got.launch.merged.arguments.jvm.includes("-Dggl.check=1"));

  assert.ok(h.sent.length >= 2);
  for (const s of h.sent) {
    assert.equal("runtime" in s, false);
    assert.equal("launch" in s, false);
    assert.equal(JSON.stringify(s).includes("merged"), false);
  }
});

// L17：真反例是清理把過期目錄搬進外部（不是刪外部），只有會呼叫 removeStaleRuntime 的這層測得到
// （→ _notes/plans/cross-review-2026-10-phase1.md §測試「1a 整合（sync-index）」）
test(
  "L17 runtime-trash 是 junction ⇒ BLOCKED_BY_LINK、外部沒有多出或少了任何東西、過期目錄留在原位、沒有中斷標記",
  { skip: process.platform !== "win32" },
  async (t) => {
    const h = await setup(t, { installed: { release: REL_1 }, site: { release: REL_2 } });
    const d = await arrangeStale(h.paths);
    const outside = path.join(h.paths.root, "outside");
    await fsp.mkdir(outside);
    await fsp.writeFile(path.join(outside, "precious.txt"), "keep me");
    const trash = path.join(h.paths.tempDir, "runtime-trash");
    await fsp.mkdir(h.paths.tempDir, { recursive: true });
    await fsp.symlink(outside, trash, "junction");
    const before = {
      outside: await snapshot(outside),
      versions: await ls(d.versions),
      runtime: await ls(d.runtime),
      record: await fsp.readFile(h.paths.syncRecordPath),
    };

    await assert.rejects(h.sync.updateInstance(), (e) => {
      assert.equal(e.code, "GGL_SYNC_BLOCKED_BY_LINK");
      assert.equal(e.path, trash);
      assert.equal(e.where, "managed");
      assert.ok(e.message.includes(trash), e.message);
      return true;
    });
    assert.deepEqual(await snapshot(outside), before.outside);
    assert.deepEqual(await ls(d.versions), before.versions);
    assert.deepEqual(await ls(d.runtime), before.runtime);
    assert.deepEqual(await fsp.readFile(h.paths.syncRecordPath), before.record);
    assert.equal(await isInProgress(h.paths), false);
    assert.equal(h.calls.prepareRuntime.length, 0);
  },
);

// ── 設定故障：settings-error（→ _notes/plans/cross-review-2026-10-phase4.md §驗收格 V7、V13；D-SET-KIND）──

const { SettingsError } = require("../main/settings.js");
const { describeStatus } = require("../lib/sync/status-text.js");

const SETTINGS_PATH = "C:\\Users\\a\\AppData\\Roaming\\GGL_launcher\\settings.json";
const settingsErrors = () => [
  new SettingsError("invalid", SETTINGS_PATH, {
    issues: [{ key: "memoryGb", value: 4, reason: "不認得的設定", fix: "刪掉這一行" }],
  }),
  new SettingsError("unreadable", SETTINGS_PATH, {
    cause: Object.assign(new Error("EBUSY: resource busy or locked, open"), {
      code: "EBUSY",
      syscall: "open",
    }),
  }),
  new SettingsError("missing", SETTINGS_PATH),
];

function assertSettingsError(s, err) {
  assertKind(s, "settings-error");
  assert.deepEqual(s.ui, {
    button: { action: "retry", label: "重新檢查", note: null },
    canLaunch: false,
  });
  assert.deepEqual(s.allowed, { update: false, repair: false });
  assert.deepEqual(s.errorTexts, [err.message]);
  assert.equal(s.errorDetail, null);
  const { headline } = describeStatus(s);
  assert.ok(!headline.includes("內部錯誤"), headline);
  assert.ok(headline.includes("設定檔"), headline);
}

test("V7 中樞讀設定丟 SettingsError（不合法／讀取失敗／不見）⇒ settings-error，細節分得出三種", async (t) => {
  const texts = new Set();
  for (const err of settingsErrors()) {
    const h = await setup(t, {
      installed: { release: REL_1 },
      deps: {
        readSettings: async () => {
          throw err;
        },
      },
    });
    const s = await h.sync.getInstanceStatus();
    assertSettingsError(s, err);
    assert.deepEqual(h.last(), s);
    texts.add(s.errorTexts[0]);
  }
  assert.equal(texts.size, 3);
});

test("V7 負向：一般 Error、帶 code＋syscall 的 errno 錯、訊息像設定錯誤、帶 GGL_SETTINGS 碼但不是 SettingsError ⇒ 都是 internal-error", async (t) => {
  for (const err of [
    new Error("boom"),
    Object.assign(new Error("EISDIR: illegal operation on a directory, read"), {
      code: "EISDIR",
      syscall: "read",
    }),
    new Error("設定檔內容不合法：memoryGb"),
    Object.assign(new Error("假的"), { name: "SettingsError", code: "GGL_SETTINGS", reason: "invalid" }),
  ]) {
    const h = await setup(t, {
      installed: { release: REL_1 },
      deps: {
        readSettings: async () => {
          throw err;
        },
      },
    });
    assertKind(await h.sync.getInstanceStatus(), "internal-error");
  }
});

test("V13 啟動閘遇到設定故障 ⇒ fn 沒被呼叫、GGL_SYNC_LAUNCH_BLOCKED 帶 settings-error、鎖已放", async (t) => {
  const [err] = settingsErrors();
  const h = await setup(t, {
    installed: { release: REL_1 },
    deps: {
      readSettings: async () => {
        throw err;
      },
    },
  });
  let called = false;
  await assert.rejects(
    h.sync.withLaunchLock(async () => {
      called = true;
    }),
    (e) => {
      isCode("GGL_SYNC_LAUNCH_BLOCKED")(e);
      assertSettingsError(e.status, err);
      return true;
    },
  );
  assert.equal(called, false);
  assert.equal(h.sync.getLockHolder(), null);
});

test("V13 更新、修復遇到設定故障 ⇒ reject 那個 SettingsError、沒套用、鎖已放、最後送出 settings-error", async (t) => {
  for (const run of [(s) => s.updateInstance(), (s) => s.repairInstance()]) {
    const [err] = settingsErrors();
    const h = await setup(t, {
      installed: { release: REL_1 },
      site: { release: REL_2 },
      deps: {
        readSettings: async () => {
          throw err;
        },
      },
    });
    const sentBefore = h.sent.length;
    await assert.rejects(run(h.sync), (e) => e === err);
    assert.equal(h.calls.applyPlan.length, 0);
    assertRecomputed(h, sentBefore, "settings-error", { exactlyOne: true });
    assertSettingsError(h.last(), err);
  }
});

test("V13 listStrayJars 遇到設定故障 ⇒ reject 那個 SettingsError、不重算（現行為）", async (t) => {
  const [err] = settingsErrors();
  const h = await setup(t, {
    installed: { release: REL_1 },
    deps: {
      readSettings: async () => {
        throw err;
      },
    },
  });
  const sentBefore = h.sent.length;
  await assert.rejects(h.sync.listStrayJars(), (e) => e === err);
  assert.equal(h.sent.length, sentBefore);
});

// ── 全檔收尾：必須是最後一個案例 ──

test("N18 整個測試檔跑完，假站台的 notice.json 被請求 0 次", () => {
  assert.equal(noticeRequests, 0);
});
