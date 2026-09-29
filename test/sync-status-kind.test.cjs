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
const unreachable = (reason = "network", detail) => ({
  side: "unreachable",
  reason,
  ...(detail !== undefined && { detail }),
});
const invalid = (reason = "invalid", detail) => ({
  side: "invalid",
  reason,
  ...(detail !== undefined && { detail }),
});
const gateOk = ({ maintenance = null, min = null } = {}) =>
  ok({ maintenance, minLauncherVersion: min });
const REL_FILES = [{ path: "mods/a.jar", sha256: A, size: 1 }];
const releaseOk = (files = REL_FILES, version = "GGL3.1.02") =>
  ok({ version, files });
const recordOf = (files = REL_FILES, version = "GGL3.1.01") => ({
  format: 3,
  version,
  appliedAt: "2026-09-29T12:00:00+08:00",
  files: files.map(({ path, sha256 }) => ({ path, sha256 })),
});

function input(overrides = {}) {
  const { site = {}, ...rest } = overrides;
  return {
    configured: true,
    syncing: false,
    site: { index: ok({}), gate: gateOk(), release: releaseOk(), ...site },
    record: recordOf(),
    inProgress: false,
    runtimeReady: true,
    launcherVersion: "1.0.0",
    ...rest,
  };
}

const kindOf = (overrides) => computeStatusKind(input(overrides)).kind;

test("KINDS 與上層優先序逐字相同", () => {
  assert.deepEqual(KINDS, [
    "unconfigured",
    "syncing",
    "offline",
    "maintenance",
    "launcher-too-old",
    "invalid",
    "not-installed",
    "update-available",
    "up-to-date",
  ]);
});

test("SYNC_ALLOWED_KINDS 與 18-3 相同", () => {
  assert.deepEqual(SYNC_ALLOWED_KINDS, {
    update: ["update-available"],
    repair: ["not-installed", "update-available", "up-to-date"],
  });
});

test("KIND_UI／deriveUi：9 kind × localReady 共 18 格", () => {
  const launch = (note = null) => ({ action: "launch", label: "啟動", note });
  const none = (label) => ({ action: "none", label, note: null });
  // [kind, launchPolicy, ready 按鈕, notReady 按鈕]
  const table = [
    ["unconfigured", "never", none("請先設定更新來源"), none("請先設定更新來源")],
    ["syncing", "never", none("同步中…"), none("同步中…")],
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
  ];
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

test("runtimeReady=false：線上相同 ⇒ update-available；離線有記錄 ⇒ localReady=false、重試連線", () => {
  assert.equal(kindOf({ runtimeReady: false }), "update-available");
  const r = computeStatusKind(
    input({ runtimeReady: false, site: { release: unreachable() } }),
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
    input({ runtimeReady: false, site: { gate: m, release: invalid() } }),
  );
  assert.equal(deriveUi(notReady.kind, notReady.localReady).canLaunch, false);
  assert.deepEqual(gateMessages(m, "1.0.0"), ["伺服器維護中"]);
});

test("gate invalid：kind 照 release 算；沒記錄 ⇒ not-installed 有安裝鈕；gateMessages 有提示", () => {
  const g = invalid("parse");
  assert.equal(kindOf({ site: { gate: g } }), "up-to-date");
  const r = computeStatusKind(input({ record: null, site: { gate: g } }));
  assert.equal(r.kind, "not-installed");
  assert.equal(deriveUi(r.kind, r.localReady).button.action, "install");
  assert.deepEqual(r.errorTexts, []);
  assert.deepEqual(gateMessages(g, "1.0.0"), ["gate.json 讀不到或格式錯"]);
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

test("errorTexts：release invalid＋gate unreachable ⇒ offline、gate 的排第一、兩筆都在；缺 detail 用 reason", () => {
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

test("gateMessages：維護＋太舊 ⇒ 兩行、維護在前；unreachable／沒抓 ⇒ []", () => {
  const g = gateOk({
    maintenance: { enabled: true, message: "維護" },
    min: "2.0.0",
  });
  assert.deepEqual(gateMessages(g, "1.0.0"), [
    "維護",
    "啟動器版本過舊（需要 2.0.0 以上），請下載新版啟動器",
  ]);
  assert.deepEqual(gateMessages(unreachable(), "1.0.0"), []);
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
