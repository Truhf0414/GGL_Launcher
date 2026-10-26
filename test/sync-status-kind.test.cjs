"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  KINDS,
  SYNC_ALLOWED_KINDS,
  KIND_UI,
  computeStatusKind,
  deriveUi,
  gateMessages,
} = require("../lib/sync/status-kind.js");

const A = "a".repeat(64);
const B = "b".repeat(64);
const U = "無法確認是否為最新版";

const ok = (value) => ({ side: "ok", value });
// 正式的 SiteResult 一律帶 detail（main/sync/site-client.js 的 miss()）；沒指定就拿 reason 當 detail 的字面值
const unreachable = (reason = "network", detail = reason) => ({
  side: "unreachable",
  reason,
  detail,
});
const invalid = (reason = "invalid", detail = reason) => ({
  side: "invalid",
  reason,
  detail,
});
const gateOk = ({ maintenance = null, min = null } = {}) =>
  ok({ maintenance, minLauncherVersion: min });
const REL_FILES = [{ path: "mods/a.jar", sha256: A, size: 1 }];
// ④c 起「相同」也比 minecraft／loader：兩邊預設同一套 runtime
const RUNTIME = { minecraft: "1.21.11", loader: { type: "fabric", version: "0.19.3" } };
const releaseOk = (files = REL_FILES, version = "GGL3.1.02", runtime = RUNTIME) =>
  ok({ version, files, ...runtime });
const recordOf = (files = REL_FILES, version = "GGL3.1.01", runtime = { ...RUNTIME, javaMajor: 21 }) => ({
  format: 3,
  version,
  appliedAt: "2026-09-29T12:00:00+08:00",
  files: files.map(({ path, sha256 }) => ({ path, sha256 })),
  ...runtime,
});

const unreadable = (detail = "EACCES: permission denied") => ({
  side: "unreadable",
  detail,
});

// record／inProgress／runtimeOk 組成 local（runtimeOk ⇒ local.runtime.ready，⑤c C3）；直接給 local 則以它為準（例如讀不到）
function input(overrides = {}) {
  const {
    site = {},
    record = recordOf(),
    inProgress = false,
    runtimeOk = true,
    local,
    ...rest
  } = overrides;
  return {
    configured: true,
    syncing: false,
    site: { index: ok({}), gate: gateOk(), release: releaseOk(), ...site },
    local: local ?? { side: "ok", record, inProgress, runtime: { ready: runtimeOk } },
    launcherVersion: "1.0.0",
    ...rest,
  };
}

const kindOf = (overrides) => computeStatusKind(input(overrides)).kind;

test("KINDS 與上層優先序逐字相同", () => {
  assert.deepEqual(KINDS, [
    "unconfigured",
    "syncing",
    "local-unreadable",
    "offline",
    "maintenance",
    "launcher-too-old",
    "invalid",
    "not-installed",
    "update-available",
    "up-to-date",
    "internal-error",
    "settings-error",
  ]);
});

test("SYNC_ALLOWED_KINDS 與 18-3 相同", () => {
  assert.deepEqual(SYNC_ALLOWED_KINDS, {
    update: ["update-available"],
    repair: ["not-installed", "update-available", "up-to-date"],
  });
});

test("KIND_UI／deriveUi：11 kind × localReady 共 22 格", () => {
  const launch = (note = null) => ({ action: "launch", label: "啟動", note });
  const none = (label) => ({ action: "none", label, note: null });
  const recheck = { action: "retry", label: "重新檢查", note: null };
  // [kind, launchPolicy, ready 按鈕, notReady 按鈕]
  const table = [
    ["unconfigured", "never", none("請先設定更新來源"), none("請先設定更新來源")],
    ["syncing", "never", none("同步中…"), none("同步中…")],
    ["local-unreadable", "never", recheck, recheck],
    [
      "offline",
      "ifLocalReady",
      launch(U),
      { action: "retry", label: "重試連線", note: null },
    ],
    ["maintenance", "ifLocalReady", launch(), none("維護中")],
    ["launcher-too-old", "ifLocalReady", launch(), none("無法啟動")],
    ["invalid", "ifLocalReady", launch(), none("無法啟動")],
    [
      "not-installed",
      "never",
      { action: "install", label: "安裝", note: null },
      { action: "install", label: "安裝", note: null },
    ],
    [
      "update-available",
      "never",
      { action: "update", label: "更新", note: null },
      { action: "update", label: "更新", note: null },
    ],
    ["up-to-date", "always", launch(), launch()],
    ["internal-error", "never", recheck, recheck],
    ["settings-error", "never", recheck, recheck],
  ];
  assert.equal(table.length, 12);
  assert.deepEqual(Object.keys(KIND_UI).sort(), [...KINDS].sort());
  for (const [kind, policy, ready, notReady] of table) {
    assert.equal(KIND_UI[kind].launchPolicy, policy, kind);
    for (const [localReady, button] of [
      [true, ready],
      [false, notReady],
    ]) {
      const canLaunch =
        policy === "always" || (policy === "ifLocalReady" && localReady);
      assert.deepEqual(
        deriveUi(kind, localReady),
        { button, canLaunch },
        `${kind} localReady=${localReady}`,
      );
    }
  }
});

test("每個 kind 各一案", () => {
  assert.equal(kindOf({ configured: false }), "unconfigured");
  assert.equal(kindOf({ syncing: true }), "syncing");
  assert.equal(kindOf({ site: { release: unreachable() } }), "offline");
  assert.equal(
    kindOf({ site: { gate: gateOk({ maintenance: { enabled: true, message: "" } }) } }),
    "maintenance",
  );
  assert.equal(kindOf({ site: { gate: gateOk({ min: "2.0.0" }) } }), "launcher-too-old");
  assert.equal(kindOf({ site: { release: invalid() } }), "invalid");
  assert.equal(kindOf({ record: null }), "not-installed");
  assert.equal(kindOf({ record: recordOf([]) }), "update-available");
  assert.equal(kindOf({}), "up-to-date");
});

test("configured=false／syncing=true 時 site 可省略", () => {
  const { site, ...noSite } = input();
  assert.deepEqual(computeStatusKind({ ...noSite, configured: false }), {
    kind: "unconfigured",
    localReady: true,
    errorTexts: [],
    syncReasons: [],
  });
  assert.equal(computeStatusKind({ ...noSite, syncing: true }).kind, "syncing");
  assert.deepEqual(computeStatusKind({ ...noSite, syncing: true }).errorTexts, []);
});

test("syncing=true 不管站台、記錄、標記", () => {
  assert.equal(kindOf({ syncing: true, site: { index: unreachable() } }), "syncing");
  assert.equal(
    kindOf({ syncing: true, record: null, inProgress: true }),
    "syncing",
  );
});

test("索引 ok 而 gate／release 缺 ⇒ TypeError；索引非 ok 時可缺", () => {
  assert.throws(
    () => computeStatusKind(input({ site: { release: undefined } })),
    { name: "TypeError", message: /gate 與 release 都要有/ },
  );
  assert.throws(
    () => computeStatusKind(input({ site: { gate: undefined } })),
    { name: "TypeError", message: /gate 與 release 都要有/ },
  );
  assert.equal(
    computeStatusKind(
      input({ site: { index: unreachable(), gate: undefined, release: undefined } }),
    ).kind,
    "offline",
  );
});

test("同步中標記：有記錄 ⇒ update-available；沒記錄 ⇒ not-installed；離線 ⇒ offline 且 localReady=false", () => {
  assert.equal(kindOf({ inProgress: true }), "update-available");
  assert.equal(kindOf({ inProgress: true, record: null }), "not-installed");
  const r = computeStatusKind(
    input({ inProgress: true, site: { release: unreachable() } }),
  );
  assert.equal(r.kind, "offline");
  assert.equal(r.localReady, false);
});

test("gate unreachable＋release ok ⇒ offline", () => {
  assert.equal(kindOf({ site: { gate: unreachable() } }), "offline");
});

test("「相同」只比內容：只改 version ⇒ up-to-date；多一筆、少一筆、只差大小寫 ⇒ update-available", () => {
  assert.equal(kindOf({ record: recordOf(REL_FILES, "other") }), "up-to-date");
  assert.equal(
    kindOf({ record: recordOf([...REL_FILES, { path: "mods/b.jar", sha256: B }]) }),
    "update-available",
  );
  assert.equal(kindOf({ record: recordOf([]) }), "update-available");
  assert.equal(
    kindOf({ record: recordOf([{ path: "mods/A.jar", sha256: A }]) }),
    "update-available",
  );
  assert.equal(
    kindOf({ record: recordOf([{ path: "mods/a.jar", sha256: B }]) }),
    "update-available",
  );
});

test("runtime.ready=false：線上相同 ⇒ update-available；離線有記錄 ⇒ localReady=false、重試連線", () => {
  assert.equal(kindOf({ runtimeOk: false }), "update-available");
  const r = computeStatusKind(
    input({ runtimeOk: false, site: { release: unreachable() } }),
  );
  assert.equal(r.kind, "offline");
  assert.equal(r.localReady, false);
  assert.equal(deriveUi(r.kind, r.localReady).button.label, "重試連線");
});

test("invalid：有記錄可啟動；沒記錄不可啟動", () => {
  const withRecord = computeStatusKind(input({ site: { release: invalid() } }));
  assert.deepEqual(deriveUi(withRecord.kind, withRecord.localReady), {
    button: { action: "launch", label: "啟動", note: null },
    canLaunch: true,
  });
  const noRecord = computeStatusKind(
    input({ record: null, site: { release: invalid() } }),
  );
  assert.equal(noRecord.kind, "invalid");
  assert.deepEqual(deriveUi(noRecord.kind, noRecord.localReady), {
    button: { action: "none", label: "無法啟動", note: null },
    canLaunch: false,
  });
});

test("維護中：release 抓不到 ⇒ offline、訊息照顯示；相同 ⇒ 可啟動；沒記錄 ⇒ 沒安裝鈕；有更新 ⇒ 仍是 maintenance", () => {
  const m = gateOk({ maintenance: { enabled: true, message: "今晚維護" } });
  const off = input({ site: { gate: m, release: unreachable() } });
  assert.equal(computeStatusKind(off).kind, "offline");
  assert.deepEqual(gateMessages(m, "1.0.0"), ["今晚維護"]);

  const same = computeStatusKind(input({ site: { gate: m } }));
  assert.equal(same.kind, "maintenance");
  assert.equal(same.localReady, true);
  assert.deepEqual(deriveUi(same.kind, same.localReady), {
    button: { action: "launch", label: "啟動", note: null },
    canLaunch: true,
  });

  const noRecord = computeStatusKind(input({ record: null, site: { gate: m } }));
  assert.equal(noRecord.kind, "maintenance");
  const ui = deriveUi(noRecord.kind, noRecord.localReady);
  assert.equal(ui.canLaunch, false);
  assert.equal(ui.button.action, "none");

  assert.equal(
    kindOf({ record: recordOf([]), site: { gate: m } }),
    "maintenance",
  );
});

test("維護中＋release invalid＋有記錄 ⇒ maintenance、canLaunch 隨 localReady、errorTexts 含 release 的", () => {
  const m = gateOk({ maintenance: { enabled: true, message: "" } });
  const r = computeStatusKind(
    input({ site: { gate: m, release: invalid("invalid", "release.files: 必須是陣列") } }),
  );
  assert.equal(r.kind, "maintenance");
  assert.equal(deriveUi(r.kind, r.localReady).canLaunch, true);
  assert.deepEqual(r.errorTexts, ["release.json：release.files: 必須是陣列"]);
  const notReady = computeStatusKind(
    input({ runtimeOk: false, site: { gate: m, release: invalid() } }),
  );
  assert.equal(deriveUi(notReady.kind, notReady.localReady).canLaunch, false);
  assert.deepEqual(gateMessages(m, "1.0.0"), ["伺服器維護中"]);
});

test("太舊：release 抓不到 ⇒ offline、訊息照顯示；有記錄可啟動；沒記錄不可啟動；與 invalid 同時 ⇒ 太舊", () => {
  const old = gateOk({ min: "2.0.0" });
  assert.equal(kindOf({ site: { gate: old, release: unreachable() } }), "offline");
  assert.deepEqual(gateMessages(old, "1.0.0"), [
    "啟動器版本過舊（需要 2.0.0 以上），請下載新版啟動器",
  ]);
  const ready = computeStatusKind(input({ site: { gate: old } }));
  assert.equal(ready.kind, "launcher-too-old");
  assert.deepEqual(deriveUi(ready.kind, ready.localReady), {
    button: { action: "launch", label: "啟動", note: null },
    canLaunch: true,
  });
  const noRecord = computeStatusKind(input({ record: null, site: { gate: old } }));
  assert.deepEqual(deriveUi(noRecord.kind, noRecord.localReady), {
    button: { action: "none", label: "無法啟動", note: null },
    canLaunch: false,
  });
  assert.equal(
    kindOf({ site: { gate: old, release: invalid() } }),
    "launcher-too-old",
  );
});

test("版本比較：相等不擋；1.0.0-beta 對 1.0.0 不擋", () => {
  assert.equal(kindOf({ site: { gate: gateOk({ min: "1.0.0" }) } }), "up-to-date");
  assert.equal(
    kindOf({ launcherVersion: "1.0.0-beta", site: { gate: gateOk({ min: "1.0.0" }) } }),
    "up-to-date",
  );
});

test("errorTexts：索引 invalid ⇒ invalid 且只有索引的", () => {
  const r = computeStatusKind(
    input({
      site: { index: invalid("invalid", "index.format: 必須是 3"), gate: undefined, release: undefined },
    }),
  );
  assert.equal(r.kind, "invalid");
  assert.deepEqual(r.errorTexts, ["manifest.json：index.format: 必須是 3"]);
});

// 原本還釘「缺 detail 用 reason」：正式的 SiteResult 一定有 detail，那條退路已刪（→ _notes/plans/cross-review-2026-10-phase6c.md §L-CONTRACT）
test("errorTexts：release invalid＋gate unreachable ⇒ offline、gate 的排第一、兩筆都在", () => {
  const r = computeStatusKind(
    input({ site: { gate: unreachable("http"), release: invalid("parse") } }),
  );
  assert.equal(r.kind, "offline");
  assert.deepEqual(r.errorTexts, ["gate.json：http", "release.json：parse"]);
});

test("errorTexts：決定 kind 的那筆排第一（offline 由 release 決定時 release 在前）", () => {
  const r = computeStatusKind(
    input({ site: { release: unreachable("network", "連不上") } }),
  );
  assert.deepEqual(r.errorTexts, ["release.json：連不上"]);
});

test("errorTexts：up-to-date ⇒ []", () => {
  assert.deepEqual(computeStatusKind(input()).errorTexts, []);
});

test("gateMessages：維護＋太舊 ⇒ 兩行、維護在前；unreachable／invalid／沒抓 ⇒ []", () => {
  const g = gateOk({
    maintenance: { enabled: true, message: "維護" },
    min: "2.0.0",
  });
  assert.deepEqual(gateMessages(g, "1.0.0"), [
    "維護",
    "啟動器版本過舊（需要 2.0.0 以上），請下載新版啟動器",
  ]);
  assert.deepEqual(gateMessages(unreachable(), "1.0.0"), []);
  assert.deepEqual(gateMessages(invalid("parse"), "1.0.0"), []);
  assert.deepEqual(gateMessages(undefined, "1.0.0"), []);
  assert.deepEqual(
    gateMessages(gateOk({ maintenance: { enabled: false, message: "x" } }), "1.0.0"),
    [],
  );
});

test("launcherVersion 不是 x.y.z＋gate 有 minLauncherVersion ⇒ TypeError（C18）", () => {
  const g = gateOk({ min: "1.0.0" });
  assert.throws(() => gateMessages(g, "dev"), TypeError);
  assert.throws(
    () => computeStatusKind(input({ launcherVersion: "dev", site: { gate: g } })),
    TypeError,
  );
});

// ── N26 原因清單（R6、R10）──

const DIFF_RECORD = recordOf([{ path: "mods/old.jar", sha256: B }]);
const MAINT = gateOk({ maintenance: { enabled: true, message: "" } });
const TOO_OLD = gateOk({ min: "2.0.0" });
const NEWER = { side: "newer", reason: "format", detail: "站台已改用較新的格式（format 4），這個啟動器只認得 3，請下載新版啟動器" };
const NO_SITE = { index: undefined, gate: undefined, release: undefined };
const statusOf = (overrides) => computeStatusKind(input(overrides));

test("N26 只有檔案不同 ⇒ [release-differs]", () => {
  const r = statusOf({ record: DIFF_RECORD });
  assert.equal(r.kind, "update-available");
  assert.deepEqual(r.syncReasons, ["release-differs"]);
});

test("N26 記錄＝release＋標記 ⇒ [interrupted]", () => {
  const r = statusOf({ inProgress: true });
  assert.equal(r.kind, "update-available");
  assert.deepEqual(r.syncReasons, ["interrupted"]);
});

test("N26 有記錄、三個都中 ⇒ 整個陣列照固定順序", () => {
  const r = statusOf({ record: DIFF_RECORD, inProgress: true, runtimeOk: false });
  assert.equal(r.kind, "update-available");
  assert.deepEqual(r.syncReasons, ["release-differs", "interrupted", "runtime-missing"]);
});

test("N26 沒有記錄＋標記＋沒有 runtime ⇒ not-installed、三項各報各的", () => {
  const r = statusOf({ record: null, inProgress: true, runtimeOk: false });
  assert.equal(r.kind, "not-installed");
  assert.deepEqual(r.syncReasons, ["no-record", "interrupted", "runtime-missing"]);
});

test("N26 up-to-date ⇒ []", () => {
  const r = statusOf({});
  assert.equal(r.kind, "up-to-date");
  assert.deepEqual(r.syncReasons, []);
});

test("N26 索引連不上＋標記、release 連不上＋標記 ⇒ 都是 offline、[interrupted]、localReady false", () => {
  for (const site of [
    { index: unreachable(), gate: undefined, release: undefined },
    { release: unreachable() },
  ]) {
    const r = statusOf({ inProgress: true, site });
    assert.equal(r.kind, "offline");
    assert.deepEqual(r.syncReasons, ["interrupted"]);
    assert.equal(r.localReady, false);
  }
});

test("N26 維護中＋沒有記錄 ⇒ maintenance、含 no-record", () => {
  const r = statusOf({ record: null, site: { gate: MAINT } });
  assert.equal(r.kind, "maintenance");
  assert.ok(r.syncReasons.includes("no-record"), String(r.syncReasons));
});

test("N26 啟動器太舊＋runtime 不在 ⇒ 含 runtime-missing", () => {
  const r = statusOf({ runtimeOk: false, site: { gate: TOO_OLD } });
  assert.equal(r.kind, "launcher-too-old");
  assert.ok(r.syncReasons.includes("runtime-missing"), String(r.syncReasons));
});

test("N26 release 壞掉＋有記錄有標記 ⇒ [interrupted]、沒有 release-differs（比不了）", () => {
  const r = statusOf({ record: DIFF_RECORD, inProgress: true, site: { release: invalid() } });
  assert.equal(r.kind, "invalid");
  assert.deepEqual(r.syncReasons, ["interrupted"]);
});

test("N26 維護中、release ok 且與記錄不同 ⇒ 含 release-differs、localReady 為真", () => {
  const r = statusOf({ record: DIFF_RECORD, site: { gate: MAINT } });
  assert.equal(r.kind, "maintenance");
  assert.ok(r.syncReasons.includes("release-differs"), String(r.syncReasons));
  assert.equal(r.localReady, true);
});

test("N26 沒設定更新來源（site 三格明寫 undefined）＋沒有記錄 ⇒ unconfigured、[no-record]", () => {
  const r = computeStatusKind({
    configured: false,
    syncing: false,
    site: NO_SITE,
    local: { side: "ok", record: null, inProgress: false, runtime: { ready: true } },
    launcherVersion: "1.0.0",
  });
  assert.equal(r.kind, "unconfigured");
  assert.deepEqual(r.syncReasons, ["no-record"]);
});

test("N26 syncing＋標記 ⇒ [interrupted]、localReady false（不清空）", () => {
  const r = statusOf({ syncing: true, inProgress: true });
  assert.equal(r.kind, "syncing");
  assert.deepEqual(r.syncReasons, ["interrupted"]);
  assert.equal(r.localReady, false);
});

test("N26 local 讀不到（含 unconfigured＋讀不到）⇒ []、localReady false", () => {
  for (const overrides of [{}, { configured: false }]) {
    const r = statusOf({ ...overrides, local: unreadable() });
    assert.deepEqual(r.syncReasons, []);
    assert.equal(r.localReady, false);
  }
});

test("N26 原因清單與 localReady 對照輸入的事實（264 格）", () => {
  // 每種站台狀態另標「release 比得了嗎」——索引與 release 都 ok 才比得了
  const SITES = [
    ["沒設定", { configured: false, site: NO_SITE }, false],
    ["索引連不上", { site: { index: unreachable(), gate: undefined, release: undefined } }, false],
    ["索引壞", { site: { index: invalid(), gate: undefined, release: undefined } }, false],
    ["索引 newer", { site: { index: NEWER, gate: undefined, release: undefined } }, false],
    ["gate 連不上", { site: { gate: unreachable() } }, true],
    ["gate 壞", { site: { gate: invalid() } }, true],
    ["release 連不上", { site: { release: unreachable() } }, false],
    ["維護中", { site: { gate: MAINT } }, true],
    ["啟動器太舊", { site: { gate: TOO_OLD } }, true],
    ["release 壞", { site: { release: invalid() } }, false],
    ["全 ok", {}, true],
  ];
  const RECORDS = [
    ["相同", recordOf()],
    ["不同", DIFF_RECORD],
    ["沒有", null],
  ];
  let cells = 0;
  for (const [siteLabel, siteOverrides, comparable] of SITES) {
    for (const [recordLabel, record] of RECORDS) {
      for (const inProgress of [false, true]) {
        for (const runtimeOk of [true, false]) {
          for (const syncing of [false, true]) {
            const expected = [];
            if (record === null) expected.push("no-record");
            if (recordLabel === "不同" && comparable) expected.push("release-differs");
            if (inProgress) expected.push("interrupted");
            if (!runtimeOk) expected.push("runtime-missing");
            const r = statusOf({ ...siteOverrides, record, inProgress, runtimeOk, syncing });
            const at = `${siteLabel}／記錄${recordLabel}／標記 ${inProgress}／runtime ${runtimeOk}／syncing ${syncing}`;
            assert.deepEqual(r.syncReasons, expected, at);
            assert.equal(r.localReady, record !== null && !inProgress && runtimeOk, at);
            cells++;
          }
        }
      }
    }
  }
  assert.equal(cells, 264);
});

// ── N27 local-unreadable（R4）──

const LOCAL_LINE = "讀不到本機的同步記錄：EACCES: permission denied";

test("N27 讀不到＋站台連不上 ⇒ local-unreadable、本機那句排第一、後面接站台的", () => {
  const r = statusOf({
    local: unreadable(),
    site: { index: unreachable("network", "連不上"), gate: undefined, release: undefined },
  });
  assert.equal(r.kind, "local-unreadable");
  assert.equal(r.localReady, false);
  assert.deepEqual(r.errorTexts, [LOCAL_LINE, "manifest.json：連不上"]);
});

test("N27 讀不到 × 維護中／啟動器太舊／release 壞／索引 newer ⇒ 仍是 local-unreadable", () => {
  for (const site of [
    { gate: MAINT },
    { gate: TOO_OLD },
    { release: invalid() },
    { index: NEWER, gate: undefined, release: undefined },
  ]) {
    const r = statusOf({ local: unreadable(), site });
    assert.equal(r.kind, "local-unreadable", JSON.stringify(site));
    assert.equal(r.errorTexts[0], LOCAL_LINE);
  }
});

test("N27 讀不到＋gate 連不上＋release 壞（索引 ok）⇒ errorTexts 整個陣列＝本機、gate、release", () => {
  const r = statusOf({
    local: unreadable(),
    site: { gate: unreachable("http", "HTTP 530"), release: invalid("parse", "內容不是 JSON") },
  });
  assert.equal(r.kind, "local-unreadable");
  assert.deepEqual(r.errorTexts, [LOCAL_LINE, "gate.json：HTTP 530", "release.json：內容不是 JSON"]);
});

test("N27 讀不到時 syncing 優先、沒設定更新來源優先", () => {
  assert.equal(statusOf({ local: unreadable(), syncing: true }).kind, "syncing");
  assert.equal(statusOf({ local: unreadable(), configured: false }).kind, "unconfigured");
});

// settings-error → _notes/plans/cross-review-2026-10.md D-SET-KIND（Phase 4 V13）
test("N27 local-unreadable、internal-error、settings-error：never＋重新檢查、不在任何允許同步的集合", () => {
  for (const kind of ["local-unreadable", "internal-error", "settings-error"]) {
    assert.ok(KINDS.includes(kind), kind);
    assert.deepEqual(deriveUi(kind, true), {
      button: { action: "retry", label: "重新檢查", note: null },
      canLaunch: false,
    });
    for (const [action, kinds] of Object.entries(SYNC_ALLOWED_KINDS)) {
      assert.equal(kinds.includes(kind), false, `${kind} 在 ${action}`);
    }
  }
});

// ── N28 索引 newer（R7）──

test("N28 索引 newer ⇒ launcher-too-old、叫人下載新版、本機齊就能啟動", () => {
  const r = statusOf({ site: { index: NEWER, gate: undefined, release: undefined } });
  assert.equal(r.kind, "launcher-too-old");
  assert.equal(r.localReady, true);
  assert.match(r.errorTexts[0], /請下載新版啟動器/);
  assert.equal(r.errorTexts[0], `manifest.json：${NEWER.detail}`);
  assert.equal(deriveUi(r.kind, r.localReady).canLaunch, true);
});

test("N28 gate 同時維護中與版本過舊 ⇒ maintenance", () => {
  const g = gateOk({ maintenance: { enabled: true, message: "" }, min: "2.0.0" });
  assert.equal(kindOf({ site: { gate: g } }), "maintenance");
});

// → _notes/plans/instance-sync-v3-commit4c.md §測試 C3
test("C3 只改 loader／只改 minecraft ⇒ update-available 且含 release-differs；③ 的記錄（沒三欄）同", () => {
  const cases = [
    releaseOk(REL_FILES, "GGL3.1.02", { ...RUNTIME, loader: { type: "fabric", version: "0.19.4" } }),
    releaseOk(REL_FILES, "GGL3.1.02", { ...RUNTIME, minecraft: "1.21.12" }),
  ];
  for (const release of cases) {
    const r = computeStatusKind(input({ site: { release } }));
    assert.equal(r.kind, "update-available");
    assert.deepEqual(r.syncReasons, ["release-differs"]);
  }
  const old = recordOf(REL_FILES, "GGL3.1.01", {});
  const r = computeStatusKind(input({ record: old }));
  assert.equal(r.kind, "update-available");
  assert.ok(r.syncReasons.includes("release-differs"));
});

// ── gate invalid（→ _notes/plans/cross-review-2026-10.md D-GATE 群；_notes/plans/cross-review-2026-10-phase3.md K1–K7）──

test("K1 gate invalid ⇒ invalid、不能安裝更新修復；齊可啟動、沒記錄不可；錯在哪進 errorTexts、gateMessages 不另出", () => {
  const g = invalid("parse");
  const ready = computeStatusKind(input({ site: { gate: g } }));
  assert.equal(ready.kind, "invalid");
  assert.deepEqual(deriveUi(ready.kind, ready.localReady), {
    button: { action: "launch", label: "啟動", note: null },
    canLaunch: true,
  });
  assert.deepEqual(ready.errorTexts, ["gate.json：parse"]);
  const noRecord = computeStatusKind(input({ record: null, site: { gate: g } }));
  assert.equal(noRecord.kind, "invalid");
  assert.deepEqual(deriveUi(noRecord.kind, noRecord.localReady), {
    button: { action: "none", label: "無法啟動", note: null },
    canLaunch: false,
  });
  assert.deepEqual(gateMessages(g, "1.0.0"), []);
  for (const [action, kinds] of Object.entries(SYNC_ALLOWED_KINDS)) {
    assert.equal(kinds.includes("invalid"), false, action);
  }
});

test("K2 gate invalid＋站台有新版＋本機舊版齊 ⇒ invalid、可啟動舊版（D-GATE-STALE）", () => {
  const r = statusOf({ record: DIFF_RECORD, site: { gate: invalid("parse") } });
  assert.equal(r.kind, "invalid");
  assert.deepEqual(r.syncReasons, ["release-differs"]);
  assert.equal(r.localReady, true);
  assert.equal(deriveUi(r.kind, r.localReady).canLaunch, true);
});

test("K3 gate invalid＋release invalid ⇒ invalid、gate 的排第一、兩筆都在", () => {
  const r = statusOf({
    site: { gate: invalid("invalid", "gate.maintenance.enabled: 必須是布林"), release: invalid("parse", "內容不是 JSON") },
  });
  assert.equal(r.kind, "invalid");
  assert.deepEqual(r.errorTexts, [
    "gate.json：gate.maintenance.enabled: 必須是布林",
    "release.json：內容不是 JSON",
  ]);
});

test("K4 gate invalid＋release unreachable ⇒ offline、release 的排第一、gate 的仍在", () => {
  const r = statusOf({
    site: { gate: invalid("http", "HTTP 404"), release: unreachable("http", "HTTP 530") },
  });
  assert.equal(r.kind, "offline");
  assert.deepEqual(r.errorTexts, ["release.json：HTTP 530", "gate.json：HTTP 404"]);
});

test("K5 gate invalid × 本機讀不到 ⇒ local-unreadable、本機那句排第一、gate 的接在後面", () => {
  const r = statusOf({ local: unreadable(), site: { gate: invalid("http", "HTTP 404") } });
  assert.equal(r.kind, "local-unreadable");
  assert.deepEqual(r.errorTexts, [LOCAL_LINE, "gate.json：HTTP 404"]);
});

test("K6 索引 newer（gate 沒抓）⇒ 不受影響；gateMessages 對沒抓、invalid 都回 []", () => {
  const r = statusOf({ site: { index: NEWER, gate: undefined, release: undefined } });
  assert.equal(r.kind, "launcher-too-old");
  assert.deepEqual(r.errorTexts, [`manifest.json：${NEWER.detail}`]);
  assert.deepEqual(gateMessages(undefined, "1.0.0"), []);
  assert.deepEqual(gateMessages(invalid("http", "HTTP 404"), "1.0.0"), []);
});

test("K7 gate invalid 時 syncing、沒設定更新來源照樣優先", () => {
  assert.equal(kindOf({ syncing: true, site: { gate: invalid() } }), "syncing");
  assert.equal(kindOf({ configured: false, site: { gate: invalid() } }), "unconfigured");
});
