"use strict";

// docs/site-format.md 的行為條目（[SF-…]）逐條釘住：案名開頭＝條目編號，案件的輸入與結果＝該條的「例：」。
// 文件改了要一起改這裡；這裡改了也要一起改文件——最後一案（SF-編號對照）會比對兩邊的編號。
// 不帶時區的日期一律拿本機時間建構式比，不寫死時差；normalizeBroadcastNotifications 一律傳固定的 now。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { validateGate, validateNotice } = require("../lib/sync/site-format.js");
const {
  parseNoticeFields,
  parseNoticeLogText,
} = require("../lib/sync/notice.js");
const {
  normalizeBroadcastNotifications,
  parseIsoDateToMs,
} = require("../lib/notifications-broadcast.js");
const {
  SYNC_ALLOWED_KINDS,
  computeStatusKind,
  deriveUi,
  gateMessages,
} = require("../lib/sync/status-kind.js");
const { describeStatus } = require("../lib/sync/status-text.js");
const { getPaths } = require("../lib/paths-layout.js");
const { createSiteClient } = require("../main/sync/site-client.js");
const { createNoticeFeed } = require("../main/sync/notice-feed.js");
const { createInstanceSync } = require("../main/sync/index.js");
const { writeRecord } = require("../main/sync/instance-record.js");
const { RUNTIME, installRuntime } = require("./helpers/installed-runtime.cjs");
const {
  registerNotificationsIpc,
} = require("../main/ipc/notifications-ipc.js");
const {
  makeEl,
  fakeDocument,
  loadRendererModule,
  onDom,
  makeCtx,
} = require("./helpers/fake-dom.cjs");

const DOC = path.join(__dirname, "..", "docs", "site-format.md");
const INSTANCE_UI = path.join(__dirname, "..", "renderer", "instance-ui.js");
const NOTIFICATIONS_UI = path.join(
  __dirname,
  "..",
  "renderer",
  "notifications-ui.js",
);

const SITE = "https://ggl.test/";
const MANIFEST_URL = `${SITE}manifest.json`;
const NOTICE_URL = `${SITE}notice.json`;
const LOG_URL = `${SITE}changelog.json`;
const OK_INDEX = {
  side: "ok",
  value: {
    gate: `${SITE}gate.json`,
    notice: NOTICE_URL,
    release: `${SITE}release.json`,
    files: `${SITE}files/`,
  },
};
const NOW = Date.parse("2026-10-08T12:00:00+08:00");
const LAUNCHER = "1.0.0";
const SHA = "a".repeat(64);
const FILES = [{ path: "mods/a.jar", sha256: SHA, size: 1 }];
// ④c 起「相同」也比 minecraft／loader，記錄帶 runtime 三欄（→ instance-sync-v3-commit4c.md）
const RELEASE = {
  version: "v1",
  files: FILES,
  minecraft: RUNTIME.minecraft,
  loader: RUNTIME.loader,
};
const RECORD = {
  format: 3,
  version: "v1",
  appliedAt: "2026-10-01T00:00:00.000Z",
  files: [{ path: "mods/a.jar", sha256: SHA }],
  ...RUNTIME,
};

// JSON 能寫出來的每一種值（undefined＝那個鍵沒寫）；型別規定逐格斷言
const ALL_VALUES = [
  ["沒寫", undefined],
  ["null", null],
  ["空字串", ""],
  ["只有空白", "   "],
  ["字串", "  x  "],
  ["看起來像數字的字串", "5"],
  ["數字", 5],
  ["布林", true],
  ["物件", {}],
  ["陣列", [7]],
];

// ── 共用：假 fetch、gate 狀態、公告卡、鈴鐺 ──

/** routes：url → { status?, body?, type? } | Error（連不上）；沒列的一律 404 */
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const r = routes[url];
    if (r instanceof Error) throw r;
    const status = r?.status ?? (r ? 200 : 404);
    const body = r?.body ?? "";
    return {
      status,
      text: async () =>
        typeof body === "string" ? body : JSON.stringify(body),
      body: null,
    };
  };
  impl.calls = calls;
  impl.count = (url) => calls.filter((u) => u === url).length;
  return impl;
}

async function fetchGate(gateRoute) {
  const fetchImpl = fakeFetch({ [OK_INDEX.value.gate]: gateRoute });
  const { gate } = await createSiteClient({ fetchImpl }).fetchSite(OK_INDEX);
  return gate;
}

const gateOf = (json) => {
  const v = validateGate(json);
  return v.ok
    ? { side: "ok", value: v.value }
    : { side: "invalid", reason: "invalid", detail: v.error };
};

/**
 * 啟動器拿到這份 gate 之後的狀態：kind、按鈕、能不能啟動、能不能更新修復、gate 訊息、標題。
 * release 預設 ok；local 給了就整個取代本機輸入（例如讀不到）。
 */
function statusWith(
  gate,
  {
    installed = true,
    launcherVersion = LAUNCHER,
    record = RECORD,
    inProgress = false,
    runtimeReady = true,
    release = { side: "ok", value: RELEASE },
    local,
  } = {},
) {
  const r = computeStatusKind({
    configured: true,
    syncing: false,
    site: { index: { side: "ok", value: {} }, gate, release },
    local: local ?? {
      side: "ok",
      record: installed ? record : null,
      inProgress,
      runtime: { ready: runtimeReady },
    },
    launcherVersion,
  });
  const ui = deriveUi(r.kind, r.localReady);
  const messages = gateMessages(gate, launcherVersion);
  return {
    kind: r.kind,
    button: ui.button.label,
    note: ui.button.note,
    canLaunch: ui.canLaunch,
    canUpdate: SYNC_ALLOWED_KINDS.update.includes(r.kind),
    canRepair: SYNC_ALLOWED_KINDS.repair.includes(r.kind),
    messages,
    errorTexts: r.errorTexts,
    headline: describeStatus({
      ...r,
      gateMessages: messages,
      localVersion: installed ? record.version : "",
      remoteVersion: release.side === "ok" ? release.value.version : "",
    }).headline,
  };
}

async function fetchNoticeWith(routes, { now } = {}) {
  const fetchImpl = fakeFetch(routes);
  const client = createSiteClient({ fetchImpl, ...(now ? { now } : {}) });
  return { got: await client.fetchNotice(OK_INDEX), fetchImpl, client };
}

const noticeRoute = (body) => ({ [NOTICE_URL]: { body } });

function noticeCard() {
  const { GglRendererInstanceUi } = loadRendererModule(INSTANCE_UI);
  const el = {
    noticeTitle: makeEl(),
    noticeDate: makeEl(),
    noticeLog: makeEl(),
    noticeThumb: makeEl(),
  };
  el.noticeTitle.textContent = "預設標題";
  el.noticeDate.textContent = "預設副標";
  const handlers = new Map();
  GglRendererInstanceUi.createInstanceUi({
    ctx: makeCtx({
      fx: { onIpc: (ch, fn) => handlers.set(ch, fn), onDom },
      ui: {
        ...el,
        instanceStatusText: makeEl(),
        instanceStatusNote: makeEl(),
        btnCopyErrorDetail: makeEl(),
      },
    }),
  }).init();
  return { show: (snapshot) => handlers.get("notice:changed")(snapshot), el };
}

/** 主程序的鈴鐺 IPC；dismissed 是真的集合，清除會寫回去 */
function bellIpc(getList, dismissed = new Set()) {
  const handlers = new Map();
  registerNotificationsIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps: {
      getNotifications: getList,
      readDismissedNotificationIds: async () => new Set(dismissed),
      writeDismissedNotificationIds: async (set) => {
        dismissed.clear();
        for (const id of set) dismissed.add(id);
      },
    },
  });
  return {
    get: (lastSeenKey = "") =>
      handlers.get("notifications:get")({ sender: {} }, { lastSeenKey }),
    clear: () => handlers.get("notifications:clear")({ sender: {} }),
  };
}

const notifs = (list, nowMs = NOW) =>
  normalizeBroadcastNotifications(list, nowMs);

/** 同步中樞（真的），站台換成可改的假 siteClient；計 gate 被抓了幾次 */
async function hub(t, { installed }) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-sf-doc-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const settings = { launcherRootDir: root };
  if (installed) {
    await writeRecord(getPaths(settings), RECORD, { log: () => {} });
    await installRuntime(getPaths(settings));
  }
  const site = {
    gate: {
      side: "ok",
      value: { maintenance: null, minLauncherVersion: null },
    },
    gateFetches: 0,
  };
  const siteClient = {
    fetchIndex: async () => ({ side: "ok", value: {} }),
    fetchSite: async () => {
      site.gateFetches++;
      return { gate: site.gate, release: { side: "ok", value: RELEASE } };
    },
  };
  const sync = createInstanceSync({
    launcherVersion: LAUNCHER,
    serverConfig: { manifestUrl: MANIFEST_URL, protectedPaths: [] },
    siteClient,
    readSettings: async () => settings,
    isMinecraftRunning: async () => false,
    log: () => {},
    onProgress: () => {}, // 必填（6b-3b，M-DI #8）
    sendInstanceStatus: () => {},
    confirmGameClosed: async () => true,
  });
  return { sync, site };
}

// ── gate.json ──

test("SF-G1 兩個鍵都可以不寫：{} ⇒ 讀成功、不維護、不限版本", () => {
  assert.deepEqual(validateGate({}), {
    ok: true,
    value: { maintenance: null, minLauncherVersion: null },
  });
  const s = statusWith(gateOf({}));
  assert.equal(s.kind, "up-to-date");
  assert.deepEqual(s.messages, []);
});

test('SF-G2 maintenance 寫了就必須是物件："maintenance": null ⇒ gate 壞掉', () => {
  assert.equal(validateGate({ maintenance: null }).ok, false);
  for (const [label, v] of ALL_VALUES) {
    const r = validateGate({ maintenance: v });
    if (v === undefined) assert.equal(r.ok, true, label);
    else if (label === "物件")
      assert.equal(r.error, "gate.maintenance.enabled: 必須是布林", label);
    else assert.equal(r.error, "gate.maintenance: 不是物件", label);
  }
});

test('SF-G3 maintenance.enabled 必填、只能是 true 或 false："enabled": "true" ⇒ gate 壞掉', () => {
  assert.equal(validateGate({ maintenance: { enabled: "true" } }).ok, false);
  assert.equal(validateGate({ maintenance: { enabled: true } }).ok, true);
  assert.equal(validateGate({ maintenance: { enabled: false } }).ok, true);
  for (const [label, v] of ALL_VALUES) {
    if (label === "布林") continue;
    assert.equal(
      validateGate({ maintenance: { enabled: v } }).error,
      "gate.maintenance.enabled: 必須是布林",
      label,
    );
  }
});

test('SF-G4 maintenance.message 可以不寫；寫了就必須是字串："message": 123 ⇒ gate 壞掉', () => {
  assert.equal(
    validateGate({ maintenance: { enabled: true, message: 123 } }).ok,
    false,
  );
  for (const [label, v] of ALL_VALUES) {
    const r = validateGate({ maintenance: { enabled: true, message: v } });
    if (v === undefined) assert.equal(r.value.maintenance.message, "", label);
    else if (typeof v === "string")
      assert.equal(r.value.maintenance.message, v, label);
    else assert.equal(r.error, "gate.maintenance.message: 必須是字串", label);
  }
});

test('SF-G5 minLauncherVersion 必須剛好是三段數字："1.2.3-beta" ⇒ gate 壞掉', () => {
  assert.equal(validateGate({ minLauncherVersion: "1.2.3-beta" }).ok, false);
  const cases = [
    ["沒寫", undefined, true],
    ["1.2.3", "1.2.3", true],
    ["前導零", "01.02.03", true],
    ["兩段", "1.2", false],
    ["後綴", "1.2.3-beta", false],
    ["前綴 v", "v1.2.3", false],
    ["前後空白", " 1.2.3", false],
    ["null", null, false],
    ["數字", 123, false],
  ];
  for (const [label, v, ok] of cases) {
    assert.equal(validateGate({ minLauncherVersion: v }).ok, ok, label);
  }
});

test('SF-G6 頂層鍵拼錯不會報錯：{"maintainance": {"enabled": true}} ⇒ 讀成功、不維護', () => {
  const gate = gateOf({ maintainance: { enabled: true } });
  assert.equal(gate.side, "ok");
  const s = statusWith(gate);
  assert.equal(s.kind, "up-to-date");
  assert.deepEqual(s.messages, []);
  assert.equal(
    statusWith(gateOf({ minLaucherVersion: "99.0.0" })).kind,
    "up-to-date",
  );
});

test('SF-G7 maintenance 裡的鍵拼錯不會報錯：{"enabled": true, "mesage": "週五維護"} ⇒ 顯示「伺服器維護中」', () => {
  const s = statusWith(
    gateOf({ maintenance: { enabled: true, mesage: "週五維護" } }),
  );
  assert.equal(s.kind, "maintenance");
  assert.deepEqual(s.messages, ["伺服器維護中"]);
});

test('SF-G8 gate.json 壞掉 ⇒ 不能安裝、更新、修復，維護與最低版本不生效，本機已就緒的仍可啟動：{"maintenance": {"enabled": true,}} ⇒ 不算維護、已就緒的照常啟動', async (t) => {
  const broken = [
    [
      "JSON 語法錯（多一個逗號）",
      { body: '{ "maintenance": { "enabled": true, } }' },
      "內容不是 JSON",
    ],
    [
      "型別錯",
      {
        body: {
          maintenance: { enabled: "true" },
          minLauncherVersion: "99.0.0",
        },
      },
      "gate.maintenance.enabled: 必須是布林",
    ],
    [
      "版本有後綴",
      { body: { minLauncherVersion: "99.0.0-beta" } },
      "gate.minLauncherVersion: 必須是 x.y.z",
    ],
    ["HTTP 404", { status: 404 }, "HTTP 404"],
  ];
  for (const [label, route, detail] of broken) {
    const gate = await fetchGate(route);
    assert.equal(gate.side, "invalid", label);
    const line = `gate.json：${detail}`;

    // 本機已就緒：不算維護也不算太舊、可以啟動、不能更新修復、錯在哪上畫面
    const s = statusWith(gate);
    assert.deepEqual(
      [s.kind, s.button, s.canLaunch, s.canUpdate, s.canRepair],
      ["invalid", "啟動", true, false, false],
      label,
    );
    assert.deepEqual(s.messages, [], label);
    assert.deepEqual(s.errorTexts, [line], label);
    assert.match(s.headline, /^伺服器上的版本資料有誤/, label);

    // 站台有新版、本機舊版就緒：不能更新，仍可啟動手上的舊版
    const stale = statusWith(gate, { record: { ...RECORD, files: [] } });
    assert.deepEqual(
      [stale.kind, stale.canUpdate, stale.canLaunch],
      ["invalid", false, true],
      label,
    );

    // 本機未就緒（沒裝過、上次同步沒完成、遊戲執行環境不完整）：不能啟動、不能裝
    for (const opts of [
      { installed: false },
      { inProgress: true },
      { runtimeReady: false },
    ]) {
      const notReady = statusWith(gate, opts);
      const at = `${label} ${JSON.stringify(opts)}`;
      assert.deepEqual(
        [
          notReady.kind,
          notReady.button,
          notReady.canLaunch,
          notReady.canRepair,
        ],
        ["invalid", "無法啟動", false, false],
        at,
      );
      assert.match(notReady.headline, /^伺服器上的版本資料有誤/, at);
    }

    // 更嚴重的狀況照那個狀況：release 同時抓不到 ⇒ 離線；讀不到本機記錄 ⇒ 先顯示那個
    const offline = statusWith(gate, {
      release: { side: "unreachable", reason: "http", detail: "HTTP 530" },
    });
    assert.equal(offline.kind, "offline", label);
    assert.deepEqual(
      offline.errorTexts,
      ["release.json：HTTP 530", line],
      label,
    );
    const unreadable = statusWith(gate, {
      local: { side: "unreadable", detail: "EACCES" },
    });
    assert.equal(unreadable.kind, "local-unreadable", label);
    assert.ok(unreadable.errorTexts.includes(line), label);
  }

  // main 端真的照這張表擋
  const bad = { side: "invalid", reason: "http", detail: "HTTP 404" };
  {
    const { sync, site } = await hub(t, { installed: true });
    site.gate = bad;
    let launched = false;
    await sync.withLaunchLock(async () => {
      launched = true;
    });
    assert.equal(launched, true);
    await assert.rejects(sync.updateInstance(), {
      code: "GGL_SYNC_NOT_ALLOWED",
    });
    await assert.rejects(sync.repairInstance(), {
      code: "GGL_SYNC_NOT_ALLOWED",
    });
  }
  {
    const { sync, site } = await hub(t, { installed: false });
    site.gate = bad;
    await assert.rejects(
      sync.withLaunchLock(async () => {}),
      { code: "GGL_SYNC_LAUNCH_BLOCKED" },
    );
  }
});

test("SF-G9 gate.json 抓不到（伺服器錯誤、連不上）⇒ 離線：HTTP 500 ⇒ 已裝好的可以啟動、沒裝好的只能重試", async () => {
  for (const route of [{ status: 500 }, new Error("ECONNREFUSED")]) {
    const gate = await fetchGate(route);
    assert.equal(gate.side, "unreachable");
    const ready = statusWith(gate);
    assert.equal(ready.kind, "offline");
    assert.equal(ready.canLaunch, true);
    assert.equal(ready.note, "無法確認是否為最新版");
    const notReady = statusWith(gate, { installed: false });
    assert.equal(notReady.canLaunch, false);
    assert.equal(notReady.button, "重試連線");
  }
});

test('SF-G10 維護中不擋已經裝好的玩家：{"maintenance": {"enabled": true, "message": "週五維護"}} ⇒ 裝好的照常啟動；沒裝好的不能裝；不能更新、修復', async (t) => {
  const json = { maintenance: { enabled: true, message: "週五維護" } };
  const ready = statusWith(gateOf(json));
  assert.deepEqual(
    [
      ready.kind,
      ready.button,
      ready.canLaunch,
      ready.canUpdate,
      ready.canRepair,
    ],
    ["maintenance", "啟動", true, false, false],
  );
  assert.deepEqual(ready.messages, ["週五維護"]);
  const notReady = statusWith(gateOf(json), { installed: false });
  assert.deepEqual([notReady.button, notReady.canLaunch], ["維護中", false]);

  // main 端真的照這張表擋
  {
    const { sync, site } = await hub(t, { installed: true });
    site.gate = gateOf(json);
    let launched = false;
    await sync.withLaunchLock(async () => {
      launched = true;
    });
    assert.equal(launched, true);
    await assert.rejects(sync.updateInstance(), {
      code: "GGL_SYNC_NOT_ALLOWED",
    });
    await assert.rejects(sync.repairInstance(), {
      code: "GGL_SYNC_NOT_ALLOWED",
    });
  }
  {
    const { sync, site } = await hub(t, { installed: false });
    site.gate = gateOf(json);
    await assert.rejects(
      sync.withLaunchLock(async () => {}),
      { code: "GGL_SYNC_LAUNCH_BLOCKED" },
    );
  }
});

test('SF-G11 啟動器版本過舊同樣不擋已經裝好的玩家：{"minLauncherVersion": "99.0.0"} ⇒ 裝好的照常啟動；沒裝好的顯示「無法啟動」', () => {
  const json = { minLauncherVersion: "99.0.0" };
  const ready = statusWith(gateOf(json));
  assert.deepEqual(
    [
      ready.kind,
      ready.button,
      ready.canLaunch,
      ready.canUpdate,
      ready.canRepair,
    ],
    ["launcher-too-old", "啟動", true, false, false],
  );
  assert.deepEqual(ready.messages, [
    "啟動器版本過舊（需要 99.0.0 以上），請下載新版啟動器",
  ]);
  const notReady = statusWith(gateOf(json), { installed: false });
  assert.deepEqual([notReady.button, notReady.canLaunch], ["無法啟動", false]);
});

test('SF-G12 版本只比啟動器自己版本開頭的三段數字：啟動器 1.0.0-alpha1、"minLauncherVersion": "1.0.0" ⇒ 不算過舊', () => {
  const gate = gateOf({ minLauncherVersion: "1.0.0" });
  assert.equal(
    statusWith(gate, { launcherVersion: "1.0.0-alpha1" }).kind,
    "up-to-date",
  );
  assert.equal(
    statusWith(gateOf({ minLauncherVersion: "1.0.1" }), {
      launcherVersion: "1.0.0-alpha1",
    }).kind,
    "launcher-too-old",
  );
});

test('SF-G13 維護訊息怎麼顯示："message": "" ⇒ 顯示「伺服器維護中」', () => {
  const msg = (maintenance) => statusWith(gateOf({ maintenance })).messages;
  assert.deepEqual(msg({ enabled: true, message: "" }), ["伺服器維護中"]);
  assert.deepEqual(msg({ enabled: true }), ["伺服器維護中"]);
  assert.deepEqual(msg({ enabled: true, message: "  " }), ["  "]);
  assert.deepEqual(msg({ enabled: false, message: "週五維護" }), []);
});

test('SF-G14 維護與版本過舊同時成立 ⇒ 兩行都顯示、狀態算維護：{"maintenance": {"enabled": true, "message": "週五維護"}, "minLauncherVersion": "99.0.0"}', () => {
  const s = statusWith(
    gateOf({
      maintenance: { enabled: true, message: "週五維護" },
      minLauncherVersion: "99.0.0",
    }),
  );
  assert.equal(s.kind, "maintenance");
  assert.deepEqual(s.messages, [
    "週五維護",
    "啟動器版本過舊（需要 99.0.0 以上），請下載新版啟動器",
  ]);
});

test("SF-G15 gate 不會定時重抓，只在檢查狀態、按啟動、更新或修復時重抓：改了 gate.json ⇒ 下次按啟動才生效", async (t) => {
  const { sync, site } = await hub(t, { installed: false });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(site.gateFetches, 0);
  await sync.getInstanceStatus();
  assert.equal(site.gateFetches, 1);

  // 檢查完之後才關掉維護：按啟動當場重抓，看到的是新的
  site.gate = gateOf({ maintenance: { enabled: true } });
  await assert.rejects(
    sync.withLaunchLock(async () => {}),
    {
      code: "GGL_SYNC_LAUNCH_BLOCKED",
    },
  );
  assert.equal(site.gateFetches, 2);
  site.gate = gateOf({});
  const before = site.gateFetches;
  await assert.rejects(sync.updateInstance(), { code: "GGL_SYNC_NOT_ALLOWED" });
  assert.ok(site.gateFetches > before);
});

// ── notice.json 外層 ──

test('SF-N1 兩個鍵都可以不寫；notice 可以是物件或 null：{"notice": null} ⇒ 讀成功、沒有公告', async () => {
  const { got } = await fetchNoticeWith(noticeRoute({ notice: null }));
  assert.deepEqual(got, { notice: null, notifications: [] });
  for (const [label, v] of ALL_VALUES) {
    const r = validateNotice({ notice: v });
    const ok = v === undefined || v === null || label === "物件";
    assert.equal(r.ok, ok, label);
  }
  assert.equal(validateNotice({}).ok, true);
});

test('SF-N2 notifications 寫了就必須是陣列："notifications": null ⇒ 整支當成壞掉', async () => {
  const { got } = await fetchNoticeWith(
    noticeRoute({ notice: { title: "T" }, notifications: null }),
  );
  assert.equal(got, null);
  for (const [label, v] of ALL_VALUES) {
    const ok = v === undefined || Array.isArray(v);
    assert.equal(validateNotice({ notifications: v }).ok, ok, label);
  }
});

test('SF-N3 不認得的鍵直接忽略；notice 拼錯就等於沒有公告：{"notcie": {"title": "T"}} ⇒ 沒有公告', async () => {
  const { got } = await fetchNoticeWith(
    noticeRoute({ notcie: { title: "T" } }),
  );
  assert.deepEqual(got, { notice: null, notifications: [] });
});

test("SF-N4 notice.json 壞掉 ⇒ 畫面維持上一次讀到的公告與通知，不提示、不寫 log：多一個逗號 ⇒ 照舊顯示上一則", async () => {
  const broken = [
    ["JSON 語法錯", { body: '{ "notice": { "title": "T2", } }' }],
    ["外層驗不過", { body: { notifications: {} } }],
    ["HTTP 404", { status: 404 }],
    ["HTTP 500", { status: 500 }],
    ["連不上", new Error("ECONNREFUSED")],
  ];
  for (const [label, route] of broken) {
    const routes = {
      [MANIFEST_URL]: {
        body: {
          format: 3,
          gate: "gate.json",
          notice: "notice.json",
          release: "release.json",
          files: "files/",
        },
      },
      [NOTICE_URL]: { body: { notice: { title: "T1" }, notifications: [] } },
    };
    const changes = [];
    const logged = [];
    const feed = createNoticeFeed({
      siteClient: createSiteClient({ fetchImpl: fakeFetch(routes) }),
      onChange: (s) => changes.push(s),
      serverConfig: { manifestUrl: MANIFEST_URL },
      log: (e) => logged.push(e),
      now: () => NOW,
    });
    await feed.refresh();
    routes[NOTICE_URL] = route;
    await feed.refresh();
    assert.equal(changes.length, 1, label);
    assert.equal(feed.get().notice.title, "T1", label);
    assert.deepEqual(logged, [], label);
  }
});

test("SF-N5 啟動後 1.2 秒抓第一次，之後每 30 秒重抓：改了 notice.json ⇒ 最晚 30 秒內出現", () => {
  const log = [];
  const timers = {
    setTimeout: (fn, ms) => log.push(["setTimeout", ms]),
    setInterval: (fn, ms) => log.push(["setInterval", ms]),
    clearTimeout: () => {},
    clearInterval: () => {},
  };
  createNoticeFeed({
    siteClient: { fetchIndex: async () => {}, fetchNotice: async () => null },
    onChange: () => {},
    serverConfig: { manifestUrl: MANIFEST_URL },
    log: () => {}, // 必填（6b-3b，Q10）
    timers,
  }).start();
  assert.deepEqual(log, [
    ["setTimeout", 1200],
    ["setInterval", 30000],
  ]);
});

// ── notice.json 的 notice ──

test('SF-N6 title、subtitle、imageUrl、logUrl 不是字串就當沒寫，是字串就去掉頭尾空白："title": 123 ⇒ 沒有標題', () => {
  assert.equal(parseNoticeFields({ notice: { title: 123 } }).title, "");
  for (const key of ["title", "subtitle", "imageUrl", "logUrl"]) {
    for (const [label, v] of ALL_VALUES) {
      const want = typeof v === "string" ? v.trim() : "";
      assert.equal(
        parseNoticeFields({ notice: { [key]: v } })[key],
        want,
        `${key} ${label}`,
      );
    }
  }
});

test('SF-N7 欄位名拼錯直接忽略："titel": "T" ⇒ 沒有標題', () => {
  assert.equal(parseNoticeFields({ notice: { titel: "T" } }).title, "");
});

test('SF-N8 log 的每一項都轉成文字，只丟掉空字串：[null, 3, {}, " ", ""] ⇒ "null"、"3"、"[object Object]"、" "', () => {
  assert.deepEqual(
    parseNoticeFields({ notice: { log: [null, 3, {}, " ", ""] } }).inlineLog,
    ["null", "3", "[object Object]", " "],
  );
});

test("SF-N9 log 最多顯示 150 行：寫 151 行 ⇒ 只顯示前 150 行", () => {
  const log = Array.from({ length: 151 }, (_, i) => `第 ${i + 1} 行`);
  const got = parseNoticeFields({ notice: { log } }).inlineLog;
  assert.equal(got.length, 150);
  assert.equal(got[149], "第 150 行");
});

test('SF-N10 log 必須是陣列，寫成字串整個忽略："log": "更新內容" ⇒ 沒有 log', () => {
  assert.deepEqual(
    parseNoticeFields({ notice: { log: "更新內容" } }).inlineLog,
    [],
  );
});

test('SF-N11 公告每一欄都是空的 ⇒ 等於沒有公告：{"notice": {"title": " "}} ⇒ 沒有公告', async () => {
  const { got } = await fetchNoticeWith(
    noticeRoute({ notice: { title: " " } }),
  );
  assert.equal(got.notice, null);
});

// ── logUrl ──

test('SF-L1 logUrl 只認 http:// 或 https:// 開頭的完整網址，相對路徑不會去抓："logUrl": "changelog.json" ⇒ 沒有 log', async () => {
  const { got, fetchImpl } = await fetchNoticeWith({
    ...noticeRoute({ notice: { logUrl: "changelog.json" } }),
    [LOG_URL]: { body: { log: ["a"] } },
  });
  assert.equal(fetchImpl.count(LOG_URL), 0);
  assert.equal(fetchImpl.calls.length, 1);
  assert.deepEqual(got.notice.log, []);
  // 公告仍然算有內容（logUrl 有值）
  assert.equal(got.notice.logUrl, "changelog.json");
});

test('SF-L2 有寫 log 就不抓 logUrl："log": ["a"], "logUrl": "https://…" ⇒ 只顯示 a', async () => {
  const { got, fetchImpl } = await fetchNoticeWith({
    ...noticeRoute({ notice: { log: ["a"], logUrl: LOG_URL } }),
    [LOG_URL]: { body: { log: ["b"] } },
  });
  assert.equal(fetchImpl.count(LOG_URL), 0);
  assert.deepEqual(got.notice.log, ["a"]);
});

test('SF-L3 logUrl 的內容只能是 {"log": […]}：{"log": [" a ", "", 3]} ⇒ " a "、""、"3"', () => {
  assert.deepEqual(parseNoticeLogText('{"log": [" a ", "", 3]}'), [
    " a ",
    "",
    "3",
  ]);
  assert.deepEqual(parseNoticeLogText('{"log": []}'), []);
});

test("SF-L4 其他形狀都當成抓取失敗，沿用上次抓到的：[] ⇒ 沒有 log", async () => {
  const others = [
    "[]",
    '["a"]',
    '{"lines": ["y"]}',
    " a \n b ",
    '{"a": 1}',
    "null",
    "{oops",
  ];
  for (const text of others) {
    assert.throws(() => parseNoticeLogText(text), undefined, text);
  }
  const clock = { now: NOW };
  const routes = {
    ...noticeRoute({ notice: { logUrl: LOG_URL } }),
    [LOG_URL]: { body: "[]" },
  };
  const client = createSiteClient({
    fetchImpl: fakeFetch(routes),
    now: () => clock.now,
  });
  assert.deepEqual((await client.fetchNotice(OK_INDEX)).notice.log, []);
  routes[LOG_URL] = { body: { log: ["v1"] } };
  clock.now += 61_000;
  assert.deepEqual((await client.fetchNotice(OK_INDEX)).notice.log, ["v1"]);
  routes[LOG_URL] = { body: "[]" };
  clock.now += 61_000;
  assert.deepEqual((await client.fetchNotice(OK_INDEX)).notice.log, ["v1"]);
});

test("SF-L5 logUrl 的內容最多 150 行：200 行 ⇒ 只顯示前 150 行", () => {
  const log = Array.from({ length: 200 }, (_, i) => `l${i}`);
  assert.equal(parseNoticeLogText(JSON.stringify({ log })).length, 150);
});

test("SF-L6 logUrl 抓到的內容沿用 60 秒；抓失敗就沿用上次的：改了 changelog ⇒ 最晚約 60 秒後出現", async () => {
  const clock = { now: NOW };
  const routes = {
    ...noticeRoute({ notice: { logUrl: LOG_URL } }),
    [LOG_URL]: { body: { log: ["v1"] } },
  };
  const fetchImpl = fakeFetch(routes);
  const client = createSiteClient({ fetchImpl, now: () => clock.now });
  assert.deepEqual((await client.fetchNotice(OK_INDEX)).notice.log, ["v1"]);
  routes[LOG_URL] = { body: { log: ["v2"] } };
  clock.now += 59_000;
  assert.deepEqual((await client.fetchNotice(OK_INDEX)).notice.log, ["v1"]);
  assert.equal(fetchImpl.count(LOG_URL), 1);
  clock.now += 2_000;
  assert.deepEqual((await client.fetchNotice(OK_INDEX)).notice.log, ["v2"]);
  routes[LOG_URL] = { status: 500 };
  clock.now += 61_000;
  assert.deepEqual((await client.fetchNotice(OK_INDEX)).notice.log, ["v2"]);
});

// ── notifications ──

test('SF-T1 不是物件的那則、title 與 body 都空（含只有空白）的那則直接跳過：{"title": " ", "body": ""} ⇒ 不顯示', () => {
  assert.deepEqual(notifs([{ title: " ", body: "" }]), []);
  assert.deepEqual(notifs(["文字", null, 3, [{ title: "x" }]]), []);
  assert.equal(notifs([{ title: "", body: "b" }]).length, 1);
});

test('SF-T2 title、body、timeText 不是字串就當沒寫，是字串就去掉頭尾空白："title": 5 ⇒ 沒有標題', () => {
  assert.equal(notifs([{ title: 5, body: "b" }])[0].title, "");
  for (const key of ["title", "body", "timeText"]) {
    for (const [label, v] of ALL_VALUES) {
      const n = { title: "t", body: "b", [key]: v };
      const got = notifs([n]);
      const want = typeof v === "string" ? v.trim() : "";
      // title 與 body 都空會被跳過（SF-T1）
      if (got.length === 0) continue;
      assert.equal(got[0][key], want, `${key} ${label}`);
    }
  }
});

test('SF-T3 priority 會被轉成數字，轉不出來就是 0："priority": "5" ⇒ 當成 5', () => {
  assert.equal(notifs([{ title: "x", priority: "5" }])[0].priority, 5);
  const want = new Map([
    ["沒寫", 0],
    ["null", 0],
    ["空字串", 0],
    ["只有空白", 0],
    ["字串", 0],
    ["看起來像數字的字串", 5],
    ["數字", 5],
    ["布林", 1],
    ["物件", 0],
    ["陣列", 7],
  ]);
  for (const [label, v] of ALL_VALUES) {
    assert.equal(
      notifs([{ title: "x", priority: v }])[0].priority,
      want.get(label),
      label,
    );
  }
});

test('SF-T4 id 只認字串；沒寫或不是字串 ⇒ 由 title、body、timeText 算出來："id": 7 ⇒ 改了標題就變成另一則', () => {
  const a = notifs([{ id: 7, title: "A" }])[0].id;
  const b = notifs([{ id: 7, title: "B" }])[0].id;
  assert.notEqual(a, "7");
  assert.notEqual(a, b);
  assert.equal(notifs([{ id: " n1 ", title: "A" }])[0].id, "n1");
  assert.equal(notifs([{ id: "n1", title: "B" }])[0].id, "n1");
  assert.notEqual(
    notifs([{ title: "A", timeText: "10/8" }])[0].id,
    notifs([{ title: "A", timeText: "10/9" }])[0].id,
  );
});

test("SF-T5 「清除」按 id 記：沒寫 id 時改了內容，清掉的那則會再出現；寫了 id 就不會", async () => {
  let list = notifs([{ title: "A" }, { id: "fixed", title: "X" }]);
  const ipc = bellIpc(() => list);
  await ipc.clear();
  list = notifs([{ title: "A（修正）" }, { id: "fixed", title: "X（修正）" }]);
  const { items } = await ipc.get();
  assert.deepEqual(
    items.map((n) => n.title),
    ["A（修正）"],
  );
});

test('SF-T6 日期欄位不是字串或解不出來 ⇒ 當沒寫："startsAt": "tomorrow" ⇒ 立刻顯示', () => {
  assert.equal(notifs([{ title: "x", startsAt: "tomorrow" }]).length, 1);
  const future = Date.parse("2027-01-01T00:00:00Z");
  assert.equal(notifs([{ title: "x", startsAt: future }]).length, 1);
  assert.equal(notifs([{ title: "x", createdAt: future }])[0].createdAtMs, 0);
  assert.equal(notifs([{ title: "x", expiresAt: "下週" }]).length, 1);
});

test('SF-T7 不是完整 ISO 的日期也會被解讀，結果可能不是你想的："10/8" ⇒ 2001 年 10 月 8 日', () => {
  const cases = [
    ["10/8", new Date(2001, 9, 8).getTime()],
    ["8 Oct", new Date(2001, 9, 8).getTime()],
    ["1", new Date(2001, 0, 1).getTime()],
    ["2026/10/8", new Date(2026, 9, 8).getTime()],
    ["2026-10-08T12:00", new Date(2026, 9, 8, 12, 0).getTime()],
    ["2026-10-08", Date.UTC(2026, 9, 8)],
    ["2026-10-08T12:00:00+08:00", Date.UTC(2026, 9, 8, 4, 0)],
  ];
  for (const [s, want] of cases) assert.equal(parseIsoDateToMs(s), want, s);
});

test('SF-T8 startsAt 還沒到、或 expiresAt 已經到了（含剛好那一刻）⇒ 不顯示："expiresAt" 等於現在 ⇒ 不顯示', () => {
  const at = (iso) => notifs([{ title: "x", ...iso }]).length;
  assert.equal(at({ expiresAt: "2026-10-08T12:00:00+08:00" }), 0);
  assert.equal(at({ expiresAt: "2026-10-08T12:00:01+08:00" }), 1);
  assert.equal(at({ startsAt: "2026-10-08T12:00:01+08:00" }), 0);
  assert.equal(at({ startsAt: "2026-10-08T12:00:00+08:00" }), 1);
});

test("SF-T9 expiresAt 不晚於 startsAt ⇒ expiresAt 作廢、永遠不過期：startsAt 10/8、expiresAt 10/1 ⇒ 一直顯示", () => {
  const n = {
    title: "x",
    startsAt: "2026-10-08T00:00:00+08:00",
    expiresAt: "2026-10-01T00:00:00+08:00",
  };
  assert.equal(notifs([n], Date.parse("2030-01-01T00:00:00Z")).length, 1);
});

test("SF-T10 排序：priority 大的在前，其次 createdAt 新的在前，再其次照 id：priority 都是 0 ⇒ 新的在前", () => {
  const got = notifs([
    { id: "b", title: "b", createdAt: "2026-10-01T00:00:00+08:00" },
    { id: "c", title: "c", createdAt: "2026-10-02T00:00:00+08:00" },
    { id: "a", title: "a", createdAt: "2026-10-01T00:00:00+08:00" },
    { id: "z", title: "z", priority: 1 },
  ]);
  assert.deepEqual(
    got.map((n) => n.id),
    ["z", "c", "a", "b"],
  );
});

test("SF-T11 紅點：只有排序鍵（createdAt 毫秒:id，當文字比）大於上次看過的才亮；沒寫 createdAt 的從 0 開始：看過有日期的那則之後，新增一則沒寫 createdAt ⇒ 不亮", async () => {
  const seenDated = notifs([
    { id: "a", title: "a", createdAt: "2026-10-01T00:00:00+08:00" },
  ])[0].key;
  const seenUndated = notifs([{ id: "a", title: "a" }])[0].key;
  const unread = async (list, lastSeenKey) =>
    (await bellIpc(() => notifs(list)).get(lastSeenKey)).unreadCount;
  assert.equal(await unread([{ id: "b", title: "新" }], seenDated), 0);
  assert.equal(await unread([{ id: "z", title: "新" }], seenUndated), 1);
  assert.equal(await unread([{ id: "0", title: "新" }], seenUndated), 0);
  assert.equal(
    await unread(
      [{ id: "b", title: "新", createdAt: "2026-09-30T00:00:00+08:00" }],
      seenDated,
    ),
    0,
  );
  assert.equal(
    await unread(
      [{ id: "b", title: "新", createdAt: "2026-10-02T00:00:00+08:00" }],
      seenDated,
    ),
    1,
  );
  assert.equal(
    await unread(
      [
        { id: "b", title: "新" },
        { id: "c", title: "c" },
      ],
      "",
    ),
    2,
  );
});

test("SF-T12 鈴鐺最多列 20 則，清除過的不算：25 則、清除 3 則 ⇒ 列 20 則", async () => {
  const list = notifs(
    Array.from({ length: 25 }, (_, i) => ({
      id: `n${String(i).padStart(2, "0")}`,
      title: `t${i}`,
    })),
  );
  const ipc = bellIpc(() => list, new Set(["n00", "n01", "n02"]));
  const { items } = await ipc.get();
  assert.equal(items.length, 20);
  assert.equal(items[0].id, "n03");
});

function bellUi(t, res) {
  global.document = fakeDocument;
  const store = new Map();
  global.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
  };
  t.after(() => {
    delete global.localStorage;
  });
  const asked = [];
  const { GglRendererNotificationsUi } = loadRendererModule(NOTIFICATIONS_UI);
  const ui = GglRendererNotificationsUi.createNotificationsUi({
    ctx: makeCtx({
      fx: {
        safeInvoke: async (ch, arg) => {
          asked.push([ch, arg]);
          return res;
        },
        openOverlay: () => {},
      },
    }),
  });
  // 正式的 openNotif 收到的元素（bootstrap 從 buildUiRefs 拿）
  const el = {
    notifOverlay: makeEl(),
    notifList: makeEl(),
    notifEmpty: makeEl(),
    notifError: makeEl(),
    notifFooter: makeEl(),
    btnBell: makeEl(),
  };
  return { ui, el, asked };
}

test('SF-T13 title 空、body 有字 ⇒ 標題顯示「通知」：{"body": "今晚停機"} ⇒ 標題「通知」', async (t) => {
  const { ui, el } = bellUi(t, {
    items: [{ id: "a", title: "", body: "今晚停機", timeText: "", key: "0:a" }],
    unreadCount: 1,
  });
  ui.openNotif(el);
  await new Promise((r) => setImmediate(r));
  const [titleEl, bodyEl] = el.notifList.children[0].children;
  assert.equal(titleEl.textContent, "通知");
  assert.equal(bodyEl.textContent, "今晚停機");
});

test("SF-T14 打開鈴鐺＝看過目前最新的那則：打開之後，只有比它更新的才會再亮紅點", async (t) => {
  const items = notifs([
    { id: "a", title: "a", createdAt: "2026-10-01T00:00:00+08:00" },
    { id: "b", title: "b", createdAt: "2026-10-02T00:00:00+08:00" },
  ]);
  const { ui, el, asked } = bellUi(t, { items, unreadCount: 2 });
  ui.openNotif(el);
  await new Promise((r) => setImmediate(r));
  await ui.refreshNotifIndicator(el.btnBell);
  assert.deepEqual(asked.at(-1), [
    "notifications:get",
    { lastSeenKey: `${Date.parse("2026-10-02T00:00:00+08:00")}:b` },
  ]);
});

// ── 畫面上的公告卡 ──

test('SF-S1 subtitle 裡的 / 一律變成換行："subtitle": "2026/10/08" ⇒ 顯示成三行', () => {
  const { show, el } = noticeCard();
  show({
    notice: { title: "T", subtitle: "2026/10/08", imageUrl: "", log: [] },
  });
  assert.equal(el.noticeDate.textContent, "2026\n10\n08");
  show({
    notice: { title: "T", subtitle: "週五 / 維護", imageUrl: "", log: [] },
  });
  assert.equal(el.noticeDate.textContent, "週五\n維護");
});

test('SF-S2 title 改成空的，畫面會留著上一則的標題：先 "title": "A"、再 "title": "" ⇒ 仍顯示 A', () => {
  const { show, el } = noticeCard();
  show({ notice: { title: "A", subtitle: "", imageUrl: "", log: [] } });
  show({ notice: { title: "", subtitle: "x", imageUrl: "", log: [] } });
  assert.equal(el.noticeTitle.textContent, "A");
});

test("SF-S3 imageUrl 拿掉，縮圖維持上一張；連整個公告拿掉也不換：先有圖、再不寫 imageUrl ⇒ 仍是舊圖", () => {
  const { show, el } = noticeCard();
  show({
    notice: {
      title: "T",
      subtitle: "",
      imageUrl: "https://ggl.test/a.jpg",
      log: [],
    },
  });
  show({ notice: { title: "T", subtitle: "", imageUrl: "", log: [] } });
  assert.equal(
    el.noticeThumb.style["--thumb-url"],
    'url("https://ggl.test/a.jpg")',
  );
  show({ notice: null, notifications: [] });
  assert.equal(
    el.noticeThumb.style["--thumb-url"],
    'url("https://ggl.test/a.jpg")',
  );
});

test('SF-S4 imageUrl 去掉頭尾空白後原樣當成圖片網址，不檢查開頭、也不會用站台網址補完："imageUrl": "thumb.jpg" ⇒ 圖片網址就是 thumb.jpg', () => {
  // 去掉頭尾空白是 main 端的事（SF-N6），畫面收到的已經是去好的字串
  const { show, el } = noticeCard();
  show({
    notice: { title: "T", subtitle: "", imageUrl: "thumb.jpg", log: [] },
  });
  assert.equal(el.noticeThumb.style["--thumb-url"], 'url("thumb.jpg")');
});

test('SF-S5 沒有公告 ⇒ 標題與副標回到預設、log 收起來：{"notice": null} ⇒ 顯示預設文字', () => {
  const { show, el } = noticeCard();
  show({ notice: { title: "A", subtitle: "B", imageUrl: "", log: ["l"] } });
  show({ notice: null, notifications: [] });
  assert.equal(el.noticeTitle.textContent, "預設標題");
  assert.equal(el.noticeDate.textContent, "預設副標");
  assert.equal(el.noticeLog.textContent, "");
  assert.equal(el.noticeLog.classList.contains("hidden"), true);
});

test('SF-S6 log 一項一行顯示；沒有 log 就收起來："log": ["a", "b"] ⇒ 顯示兩行', () => {
  const { show, el } = noticeCard();
  show({ notice: { title: "T", subtitle: "", imageUrl: "", log: ["a", "b"] } });
  assert.equal(el.noticeLog.textContent, "a\nb");
  assert.equal(el.noticeLog.classList.contains("hidden"), false);
  show({ notice: { title: "T", subtitle: "", imageUrl: "", log: [] } });
  assert.equal(el.noticeLog.classList.contains("hidden"), true);
});

// ── 文件與測試的編號必須一一對上 ──

test("SF-編號對照：文件的 [SF-…] 與本檔的案名一一對應，兩邊都沒有重複", () => {
  const docIds = [
    ...fs.readFileSync(DOC, "utf8").matchAll(/\[(SF-[A-Z]\d+)\]/g),
  ].map((m) => m[1]);
  const testIds = [
    // 案名裡有雙引號時 prettier 會改用單引號，兩種都要認
    ...fs
      .readFileSync(__filename, "utf8")
      .matchAll(/^test\(["'](SF-[A-Z]\d+) /gm),
  ].map((m) => m[1]);
  const dupes = (ids) => ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes(docIds), [], "文件裡有重複的編號");
  assert.deepEqual(dupes(testIds), [], "測試裡有重複的編號");
  assert.deepEqual([...docIds].sort(), [...testIds].sort());
});
